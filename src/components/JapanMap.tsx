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

export interface JapanMapProps {
  selected?: string | null;
  onSelect?: (regionId: string) => void;
  /** 都道府県ごとの塗り色(CSS の色)。未指定なら標準色 */
  fill?: (regionId: string) => string | undefined;
  /** クイズの正誤表示など */
  marks?: Record<string, 'ok' | 'ng' | 'hint'>;
  showLabels?: boolean;
  /** これが変わると表示位置をリセットする */
  resetKey?: unknown;
  ariaLabel?: string;
}

export default function JapanMap({
  selected,
  onSelect,
  fill,
  marks,
  showLabels = true,
  resetKey,
  ariaLabel = '日本地図',
}: JapanMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [t, setT] = useState({ x: 0, y: 0, k: 1 });

  useEffect(() => {
    const svg = svgRef.current!;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([
        [-100, -100],
        [W + 100, H + 100],
      ])
      .on('zoom', (e) => setT({ x: e.transform.x, y: e.transform.y, k: e.transform.k }));
    zoomRef.current = z;
    select(svg).call(z).on('dblclick.zoom', null);
    return () => {
      select(svg).on('.zoom', null);
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

  const labelMin = 2.2; // この倍率以上でラベルを出す

  return (
    <div className="map-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="japan-map"
        role="img"
        aria-label={ariaLabel}
      >
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          <rect
            x={INSET.x}
            y={INSET.y}
            width={INSET.w}
            height={INSET.h}
            className="inset-frame"
            style={{ strokeWidth: 1.5 / t.k }}
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
                style={{ fill: mark ? undefined : fill?.(s.regionId), strokeWidth: (selected === s.regionId || mark ? 2.4 : 0.8) / t.k }}
                onClick={() => onSelect?.(s.regionId)}
              >
                <title>{showLabels ? regionByMapCode.get(s.code)!.name.ja : ''}</title>
              </path>
            );
          })}
          {showLabels &&
            t.k >= labelMin &&
            shapes.map((s) => (
              <text
                key={`l${s.code}`}
                x={s.label[0]}
                y={s.label[1]}
                className="pref-label"
                style={{ fontSize: 13 / t.k, strokeWidth: 3 / t.k }}
              >
                {regionByMapCode.get(s.code)!.name.ja.replace(/[県府都]$/, '')}
              </text>
            ))}
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
