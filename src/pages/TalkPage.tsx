import { useMemo, useState } from 'react';
import JapanMap from '../components/JapanMap';
import NetaCard from '../components/NetaCard';
import PrefPicker from '../components/PrefPicker';
import { netasOf, regionById, talkById } from '../data';
import { shuffle } from '../lib/quiz';
import { useUserData } from '../lib/store';
import type { Scene } from '../types';
import type { Nav } from '../App';

const SCENES: Scene[] = ['初対面', '出張', '旅行', '手土産', '飲み会'];

export default function TalkPage({ pref, nav }: { pref: string | null; nav: Nav }) {
  const d = useUserData();
  const [scene, setScene] = useState<Scene>('初対面');
  const [seed, setSeed] = useState(0);
  const r = pref ? regionById.get(pref) : undefined;
  const talk = pref ? talkById.get(pref) : undefined;

  // 場面に合うネタを優先し、「知ってた」より未知のネタ、を3つ選ぶ
  const picks = useMemo(() => {
    if (!pref) return [];
    const all = shuffle(netasOf(pref));
    const score = (id: string, scenes: Scene[]) =>
      (scenes.includes(scene) ? 2 : 0) + (d.favorites.includes(id) ? 1 : 0);
    return all.sort((a, b) => score(b.id, b.scenes) - score(a.id, a.scenes)).slice(0, 3);
    // seed は「別のネタ」ボタンで並びを変えるため
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pref, scene, seed]);

  return (
    <div className="split split--small-map">
      <section className="split-map">
        <div className="toolbar">
          <PrefPicker value={pref} onChange={(id) => nav({ tab: 'talk', pref: id })} />
        </div>
        <JapanMap selected={pref} onSelect={(id) => nav({ tab: 'talk', pref: id })} />
      </section>
      <section className="split-panel">
        {!r || !talk ? (
          <div className="empty">
            <h2>相手の出身地は?</h2>
            <p className="muted">都道府県を選ぶと、会話に使える話題をまとめて表示します。</p>
          </div>
        ) : (
          <>
            <header className="pref-head">
              <p className="muted small">💬 この人と話すなら</p>
              <h2>{r.name.ja}出身の人</h2>
              <div className="seg wrap" role="tablist" aria-label="場面">
                {SCENES.map((s) => (
                  <button key={s} type="button" className={scene === s ? 'on' : ''} onClick={() => setScene(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </header>

            <div className="block">
              <h3>👍 褒めどころ・喜ばれる話</h3>
              <ul className="bullets">
                {talk.homeru.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>

            <div className="block">
              <h3>🍽 名物の話題</h3>
              <ul className="chips">
                {talk.meibutsu.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              {scene === '手土産' && (
                <p className="muted small">手土産を選ぶなら、相手の地元の名物は避けて、自分の地元の品にするのが無難です。</p>
              )}
            </div>

            <div className="block">
              <div className="row-between">
                <h3>✨ 使えるネタ</h3>
                <button type="button" className="ghost" onClick={() => setSeed(seed + 1)}>
                  別のネタ ↻
                </button>
              </div>
              <div className="stack">
                {picks.map((n) => (
                  <NetaCard key={n.id} neta={n} />
                ))}
              </div>
            </div>

            {talk.avoid.length > 0 && (
              <div className="block caution">
                <h3>⚠️ 気をつけたい話題</h3>
                <ul className="bullets">
                  {talk.avoid.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
