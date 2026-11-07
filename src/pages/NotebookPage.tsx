import { useRef, useState } from 'react';
import NetaCard from '../components/NetaCard';
import { netaById, netas } from '../data';
import { exportJson, importJson, resetAll, useUserData } from '../lib/store';
import type { Nav } from '../App';

export default function NotebookPage({ nav }: { nav: Nav }) {
  const d = useUserData();
  const [view, setView] = useState<'fav' | 'used' | 'all'>('fav');
  const [q, setQ] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const list =
    view === 'fav'
      ? d.favorites.map((id) => netaById.get(id)).filter((n) => n !== undefined)
      : view === 'used'
        ? Object.keys(d.used)
            .filter((id) => d.used[id] > 0)
            .sort((a, b) => d.used[b] - d.used[a])
            .map((id) => netaById.get(id))
            .filter((n) => n !== undefined)
        : netas;
  const filtered = q ? list.filter((n) => (n.oneLiner + n.detail + (d.memos[n.id] ?? '')).includes(q)) : list;

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `chizuneta-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="narrow">
      <h2>マイネタ帳</h2>
      <div className="toolbar">
        <div className="seg">
          <button type="button" className={view === 'fav' ? 'on' : ''} onClick={() => setView('fav')}>
            ★ お気に入り {d.favorites.length}
          </button>
          <button type="button" className={view === 'used' ? 'on' : ''} onClick={() => setView('used')}>
            使ったネタ
          </button>
          <button type="button" className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>
            全ネタ {netas.length}
          </button>
        </div>
        <input className="search" type="search" placeholder="キーワードで検索" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <p className="muted empty">
          {view === 'fav' ? '「☆ ネタ帳」を押したネタがここに集まります。' : '該当するネタがありません。'}
        </p>
      ) : (
        <div className="stack">
          {filtered.map((n) => (
            <NetaCard key={n.id} neta={n} showRegion compact onRegionClick={(id) => nav({ tab: 'map', pref: id })} />
          ))}
        </div>
      )}

      <details className="block settings">
        <summary>データの引き継ぎ(PC ⇄ スマホ)</summary>
        <p className="muted small">
          学習記録はこの端末のブラウザに保存されています。別の端末に移すときは、書き出したファイルを読み込んでください(読み込むと、その端末の記録は上書きされます)。
        </p>
        <div className="row">
          <button type="button" onClick={download}>
            書き出す
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            読み込む
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                importJson(await f.text());
                setMsg('読み込みました');
              } catch (err) {
                setMsg(`読み込めませんでした: ${(err as Error).message}`);
              }
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (confirm('学習記録・ネタ帳をすべて消去します。よろしいですか?')) resetAll();
            }}
          >
            すべて消去
          </button>
        </div>
        {msg && <p className="small">{msg}</p>}
      </details>
    </div>
  );
}
