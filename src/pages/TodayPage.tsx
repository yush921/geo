import { useMemo, useState } from 'react';
import JapanMap from '../components/JapanMap';
import NetaCard from '../components/NetaCard';
import { netas, regionById } from '../data';
import { todayStr, useUserData } from '../lib/store';
import type { Nav } from '../App';

/** 日付から決まる疑似乱数(同じ日は同じネタから始まる) */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export default function TodayPage({ nav }: { nav: Nav }) {
  const d = useUserData();
  const [offset, setOffset] = useState(0);

  // 「知ってた」ネタは除外。全部知っていたら全件から
  const pool = useMemo(() => {
    const unknown = netas.filter((n) => !d.known.includes(n.id));
    return unknown.length ? unknown : netas;
    // 「知ってた」を押した直後にネタが切り替わらないよう、初回の状態で固定する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = hash(todayStr()) % pool.length;
  const neta = pool[(start + offset) % pool.length];
  const r = regionById.get(neta.targets[0])!;

  return (
    <div className="split split--small-map">
      <section className="split-map">
        <JapanMap selected={r.id} onSelect={(id) => nav({ tab: 'map', pref: id })} showLabels={false} resetKey={neta.id} />
      </section>
      <section className="split-panel">
        <header className="pref-head">
          <p className="muted small">
            ☀️ 今日の1ネタ {offset > 0 && `(+${offset})`}
            {d.streak.count > 0 && ` · ${d.streak.count}日連続で学習中`}
          </p>
          <h2>
            <button type="button" className="link" onClick={() => nav({ tab: 'map', pref: r.id })}>
              {r.name.ja}
            </button>
          </h2>
        </header>
        <NetaCard neta={neta} />
        <div className="row-between">
          <button type="button" className="ghost" disabled={offset === 0} onClick={() => setOffset(offset - 1)}>
            ← 前へ
          </button>
          <button type="button" className="primary" onClick={() => setOffset(offset + 1)}>
            次のネタ →
          </button>
        </div>
        <button type="button" className="ghost" onClick={() => nav({ tab: 'talk', pref: r.id })}>
          💬 {r.name.ja}出身の人と話すなら
        </button>
      </section>
    </div>
  );
}
