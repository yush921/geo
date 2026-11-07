import { useEffect, useMemo, useRef, useState } from 'react';
import { geoMercator, geoPath, geoArea, type GeoProjection } from 'd3-geo';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { Topology } from 'topojson-specification';
import topo from '../data/jp/japan.topo.json';
import { regionByMapCode } from '../data';

type Geo = Feature<Polygon | MultiPolygon, { id: number; nam_ja: string }>;

const W = 1000;
const H = 1000;
const OKINAWA = 47;
/** 沖縄を左上の枠内に表示する(実際の位置に描くと地図が横に間延びするため) */
const INSET = { x: 16, y: 16, w: 300, h: 190 };

const fc = feature(
  topo as unknown as Topology,
  (topo as unknown as Topology).objects.japan,
) as unknown as FeatureCollection<Polygon | MultiPolygon, { id: number; nam_ja: string }>;
const features = fc.features as Geo[];

// 本土: 奄美〜北方領土が入る範囲に合わせる(小笠原の一部などは範囲外)
const mainProj: GeoProjection = geoMercator().fitExtent(
  [
    [20, 20],
    [W - 20, H - 20],
  ],
  { type: 'MultiPoint', coordinates: [[128.3, 27.0], [148.9, 45.6]] },
);
// 沖縄本島〜八重山が大きく見えるよう範囲を絞り、枠外(大東諸島など)は切り取る
const insetProj: GeoProjection = geoMercator()
  .fitExtent(
    [
      [INSET.x + 10, INSET.y + 10],
      [INSET.x + INSET.w - 10, INSET.y + INSET.h - 10],
    ],
    { type: 'MultiPoint', coordinates: [[122.9, 24.0], [128.4, 27.0]] },
  )
  .clipExtent([
    [INSET.x, INSET.y],
    [INSET.x + INSET.w, INSET.y + INSET.h],
  ]);
const mainPath = geoPath(mainProj);
const insetPath = geoPath(insetProj);

interface Shape {
  code: number;
  regionId: string;
  d: string;
  label: [number, number];
}

/** ラベル位置は一番大きい島の重心にする(東京都の離島などに引っ張られないように) */
function labelPoint(f: Geo, path: typeof mainPath): [number, number] {
  const polys: Polygon['coordinates'][] =
    f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let best = polys[0];
  let bestArea = -1;
  for (const p of polys) {
    const a = geoArea({ type: 'Polygon', coordinates: p });
    if (a > bestArea) {
      bestArea = a;
      best = p;
    }
  }
  return path.centroid({ type: 'Polygon', coordinates: best }) as [number, number];
}

const shapes: Shape[] = features.map((f) => {
  const path = f.properties.id === OKINAWA ? insetPath : mainPath;
  return {
    code: f.properties.id,
    regionId: regionByMapCode.get(f.properties.id)!.id,
    d: path(f) ?? '',
    label: labelPoint(f, path),
  };
});

/** 経度緯度 → 地図上の座標(沖縄県内は左上の枠に描く) */
export function project(lon: number, lat: number, regionId?: string): [number, number] | null {
  return (regionId === 'jp-47' ? insetProj : mainProj)([lon, lat]);
}

export type PinKind = 'capital' | 'designated' | 'major' | '観光' | '遺産';

export interface Pin {
  id: string;
  lon: number;
  lat: number;
  regionId: string;
  kind: PinKind;
  label: string;
}

export interface JapanMapProps {
  selected?: string | null;
  onSelect?: (regionId: string) => void;
  /** 都道府県ごとの塗り色(CSS の色)。未指定なら標準色 */
  fill?: (regionId: string) => string | undefined;
  /** クイズの正誤表示など */
  marks?: Record<string, 'ok' | 'ng' | 'hint'>;
  showLabels?: boolean;
  pins?: Pin[];
  activePin?: string | null;
  onPinClick?: (pin: Pin) => void;
  /** これが変わると表示位置をリセットする */
  resetKey?: unknown;
  ariaLabel?: string;
}

/** ピンの大きさ(画面上のpx)と、ラベルを出し始める拡大率 */
const PIN_STYLE: Record<PinKind, { r: number; labelAt: number }> = {
  capital: { r: 4, labelAt: 1.8 },
  designated: { r: 3.2, labelAt: 2.6 },
  major: { r: 2.6, labelAt: 3.4 },
  観光: { r: 3.6, labelAt: 4 },
  遺産: { r: 3.6, labelAt: 4 },
};

export default function JapanMap({
  selected,
  onSelect,
  fill,
  marks,
  showLabels = true,
  pins,
  activePin,
  onPinClick,
  resetKey,
  ariaLabel = '日本地図',
}: JapanMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState({ x: 0, y: 0, k: 1 });
  // 画面上の1px が地図座標でいくつになるか(スマホでも文字やピンが小さくなりすぎないように)
  const [pxScale, setPxScale] = useState(1);

  useEffect(() => {
    const svg = svgRef.current!;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 14])
      .translateExtent([
        [-100, -100],
        [W + 100, H + 100],
      ])
      .on('zoom', (e) => setT({ x: e.transform.x, y: e.transform.y, k: e.transform.k }));
    zoomRef.current = z;
    select(svg).call(z).on('dblclick.zoom', null);
    const ro = new ResizeObserver(() => {
      const r = svg.getBoundingClientRect();
      const s = Math.min(r.width / W, r.height / H);
      if (s > 0) setPxScale(1 / s);
    });
    ro.observe(svg);
    return () => {
      select(svg).on('.zoom', null);
      ro.disconnect();
    };
  }, []);

  const reset = () => {
    if (svgRef.current && zoomRef.current)
      select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, zoomIdentity);
  };
  const zoomBy = (f: number) => {
    if (svgRef.current && zoomRef.current)
      select(svgRef.current).transition().duration(200).call(zoomRef.current.scaleBy, f);
  };

  useEffect(() => {
    reset();
  }, [resetKey]);

  // 選択中の県を最後に描いて、太い枠線が隣の県に隠れないようにする
  const ordered = useMemo(() => {
    const top = new Set([selected, ...Object.keys(marks ?? {})]);
    return [...shapes.filter((s) => !top.has(s.regionId)), ...shapes.filter((s) => top.has(s.regionId))];
  }, [selected, marks]);

  const projected = useMemo(
    () =>
      (pins ?? [])
        .map((p) => ({ pin: p, xy: project(p.lon, p.lat, p.regionId) }))
        .filter((x): x is { pin: Pin; xy: [number, number] } => x.xy !== null)
        // 小さいピンを先に、県庁所在地を最後に描く
        .sort((a, b) => PIN_STYLE[a.pin.kind].r - PIN_STYLE[b.pin.kind].r),
    [pins],
  );

  const u = pxScale / t.k; // 画面上の1px に相当する地図座標
  const prefLabelAt = pins?.length ? 3 : 2.2;

  return (
    <div className="map-wrap">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="japan-map" role="img" aria-label={ariaLabel}>
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          <rect
            x={INSET.x}
            y={INSET.y}
            width={INSET.w}
            height={INSET.h}
            className="inset-frame"
            style={{ strokeWidth: 1 * u }}
          />
          {ordered.map((s) => {
            const mark = marks?.[s.regionId];
            const cls = ['pref', selected === s.regionId ? 'is-selected' : '', mark ? `is-${mark}` : '']
              .filter(Boolean)
              .join(' ');
            return (
              <path
                key={s.code}
                d={s.d}
                className={cls}
                style={{
                  fill: mark ? undefined : fill?.(s.regionId),
                  strokeWidth: (selected === s.regionId || mark ? 2 : 0.6) * u,
                }}
                onClick={() => onSelect?.(s.regionId)}
              >
                <title>{showLabels ? regionByMapCode.get(s.code)!.name.ja : ''}</title>
              </path>
            );
          })}
          {showLabels &&
            t.k >= prefLabelAt &&
            shapes.map((s) => (
              <text
                key={`l${s.code}`}
                x={s.label[0]}
                y={s.label[1]}
                className="pref-label"
                style={{ fontSize: 12 * u, strokeWidth: 3 * u }}
              >
                {regionByMapCode.get(s.code)!.name.ja.replace(/[県府都]$/, '')}
              </text>
            ))}
          {projected.map(({ pin, xy }) => {
            const st = PIN_STYLE[pin.kind];
            const active = activePin === pin.id;
            const r = (active ? st.r * 1.5 : st.r) * u;
            return (
              <g
                key={pin.id}
                className={`pin pin-${pin.kind} ${active ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onPinClick?.(pin);
                }}
              >
                {/* タップしやすいよう、見た目より大きい透明な当たり判定 */}
                <circle cx={xy[0]} cy={xy[1]} r={Math.max(r, 11 * u)} className="pin-hit" />
                {pin.kind === '遺産' ? (
                  <rect x={xy[0] - r} y={xy[1] - r} width={r * 2} height={r * 2} transform={`rotate(45 ${xy[0]} ${xy[1]})`} style={{ strokeWidth: 1.2 * u }} />
                ) : (
                  <circle cx={xy[0]} cy={xy[1]} r={r} style={{ strokeWidth: (pin.kind === 'capital' ? 2 : 1.2) * u }} />
                )}
                {(t.k >= st.labelAt || active) && (
                  <text x={xy[0] + r + 3 * u} y={xy[1]} className="pin-label" style={{ fontSize: (pin.kind === 'capital' ? 12 : 11) * u, strokeWidth: 3 * u }}>
                    {pin.label}
                  </text>
                )}
                <title>{pin.label}</title>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map-tools">
        <button type="button" onClick={() => zoomBy(1.6)} aria-label="拡大">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="縮小">
          −
        </button>
        <button type="button" onClick={reset} aria-label="全体表示">
          ⤢
        </button>
      </div>
      <div className="map-credit">地図: 地球地図日本(国土地理院)</div>
    </div>
  );
}
