import { useMemo, useState } from 'react';
import JapanMap, { type Pin } from '../components/JapanMap';
import { SpotCard, SpotDetail } from '../components/SpotCard';
import { cities, spots, spotsOf, spotById } from '../data/places';
import { usePersisted } from '../lib/usePersisted';
import NetaCard from '../components/NetaCard';
import PrefPicker from '../components/PrefPicker';
import { netasOf, prefectures, regionById, talkById } from '../data';
import { keysOf } from '../lib/quiz';
import { mastery, useUserData } from '../lib/store';
import type { Nav } from '../App';

const AREA_COLORS: Record<string, string> = {
  北海道: 'var(--a1)',
  東北: 'var(--a2)',
  関東: 'var(--a3)',
  中部: 'var(--a4)',
  近畿: 'var(--a5)',
  中国: 'var(--a6)',
  四国: 'var(--a7)',
  '九州・沖縄': 'var(--a8)',
};

export function masteryColor(m: number): string | undefined {
  if (m <= 0) return undefined;
  // 0 → 薄い, 1 → 濃い
  return `color-mix(in oklab, var(--accent) ${Math.round(15 + m * 75)}%, var(--land))`;
}

export default function ExplorePage({ pref, nav }: { pref: string | null; nav: Nav }) {
  const d = useUserData();
  const [layer, setLayer] = useState<'area' | 'mastery'>('area');
  const [show, setShow] = usePersisted('pins', { capital: true, city: false, spot: false });
  const [activeSpot, setActiveSpot] = useState<string | null>(null);
  const r = pref ? regionById.get(pref) : undefined;

  const pins = useMemo<Pin[]>(() => {
    const out: Pin[] = [];
    for (const c of cities) {
      if (c.kind === 'capital' ? show.capital : show.city)
        out.push({ id: c.id, lon: c.lon, lat: c.lat, regionId: c.regionId, kind: c.kind, label: c.name });
    }
    // 観光・遺産は全国表示、または選択中の県だけ表示
    for (const sp of spots) {
      if (sp.lat === undefined || sp.lon === undefined || sp.category === '名産') continue;
      if (show.spot || sp.regionId === pref)
        out.push({ id: sp.id, lon: sp.lon, lat: sp.lat, regionId: sp.regionId, kind: sp.category, label: sp.name });
    }
    return out;
  }, [show, pref]);

  const onPin = (pin: Pin) => {
    if (spotById.has(pin.id)) setActiveSpot(pin.id);
    nav({ tab: 'map', pref: pin.regionId });
  };
  // 別の県に移ったら写真の詳細は閉じる
  const active = activeSpot && spotById.get(activeSpot)?.regionId === pref ? spotById.get(activeSpot) : undefined;
  const talk = pref ? talkById.get(pref) : undefined;

  const fill = (id: string) =>
    layer === 'area'
      ? `color-mix(in oklab, ${AREA_COLORS[regionById.get(id)!.area]} 35%, var(--land))`
      : masteryColor(mastery(d, keysOf(regionById.get(id)!)));

  const overall = mastery(d, prefectures.flatMap(keysOf));

  return (
    <div className="split">
      <section className="split-map">
        <div className="toolbar">
          <div className="seg" role="tablist">
            <button type="button" className={layer === 'area' ? 'on' : ''} onClick={() => setLayer('area')}>
              地方
            </button>
            <button type="button" className={layer === 'mastery' ? 'on' : ''} onClick={() => setLayer('mastery')}>
              習熟度 {Math.round(overall * 100)}%
            </button>
          </div>
          <PrefPicker value={pref} onChange={(id) => nav({ tab: 'map', pref: id })} />
        </div>
        <div className="pin-legend">
          <label>
            <input type="checkbox" checked={show.capital} onChange={(e) => setShow({ ...show, capital: e.target.checked })} />
            <span className="dot" /> 県庁所在地
          </label>
          <label>
            <input type="checkbox" checked={show.city} onChange={(e) => setShow({ ...show, city: e.target.checked })} />
            <span className="dot" style={{ width: 8, height: 8, borderColor: 'var(--muted)' }} /> 主要都市
          </label>
          <label>
            <input type="checkbox" checked={show.spot} onChange={(e) => setShow({ ...show, spot: e.target.checked })} />
            <span className="dot s" /> 観光地 <span className="dot h" /> 遺産(全国)
          </label>
        </div>
        <JapanMap
          selected={pref}
          onSelect={(id) => nav({ tab: 'map', pref: id })}
          fill={fill}
          pins={pins}
          activePin={activeSpot}
          onPinClick={onPin}
        />
      </section>
      <section className="split-panel">
        {!r ? (
          <div className="empty">
            <h2>地図から都道府県を選んでください</h2>
            <p className="muted">
              ピンチやホイールで拡大できます。拡大すると県名や都市名が表示されます。ピンをタップすると観光地の写真が見られます。
            </p>
          </div>
        ) : (
          <>
            <header className="pref-head">
              <p className="muted small">{r.area}地方</p>
              <h2>
                {r.name.ja} <span className="muted kana">{r.name.kana}</span>
              </h2>
              <p>
                県庁所在地: <strong>{r.capital?.ja}</strong>
              </p>
              <button type="button" className="primary" onClick={() => nav({ tab: 'talk', pref: r.id })}>
                💬 {r.name.ja}出身の人と話すなら
              </button>
            </header>
            {active && <SpotDetail spot={active} onClose={() => setActiveSpot(null)} />}
            <div className="block">
              <h3>観光・遺産・名産</h3>
              <div className="spot-grid">
                {spotsOf(r.id).map((sp) => (
                  <SpotCard
                    key={sp.id}
                    spot={sp}
                    active={sp.id === active?.id}
                    onClick={() => setActiveSpot(sp.id === activeSpot ? null : sp.id)}
                  />
                ))}
              </div>
            </div>
            {talk && (
              <div className="block">
                <h3>名物・名産</h3>
                <ul className="chips">
                  {talk.meibutsu.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="block">
              <h3>話のネタ</h3>
              <div className="stack">
                {netasOf(r.id).map((n) => (
                  <NetaCard key={n.id} neta={n} compact />
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
