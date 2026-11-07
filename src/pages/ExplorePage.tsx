import { useState } from 'react';
import JapanMap from '../components/JapanMap';
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
  const r = pref ? regionById.get(pref) : undefined;
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
        <JapanMap selected={pref} onSelect={(id) => nav({ tab: 'map', pref: id })} fill={fill} />
      </section>
      <section className="split-panel">
        {!r ? (
          <div className="empty">
            <h2>地図から都道府県を選んでください</h2>
            <p className="muted">
              ピンチやホイールで拡大できます。拡大すると県名が表示されます。
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
