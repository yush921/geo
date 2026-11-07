import { useRef, useState } from 'react';
import NetaCard from '../components/NetaCard';
import { AREAS, netaById, netas, prefectures } from '../data';
import { spots, spotsOf } from '../data/places';
import { SpotCard } from '../components/SpotCard';
import { exportJson, importJson, resetAll, useUserData } from '../lib/store';
import type { Nav } from '../App';

export default function NotebookPage({ nav }: { nav: Nav }) {
  const d = useUserData();
  const [view, setView] = useState<'fav' | 'used' | 'all' | 'zukan'>('fav');
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
  // 写真当てクイズで一度でも正解したものを「獲得」とする
  const collected = new Set(spots.filter((sp) => (d.srs[`photo:${sp.id}`]?.correct ?? 0) > 0).map((sp) => sp.id));
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
        <div className="seg wrap">
          <button type="button" className={view === 'fav' ? 'on' : ''} onClick={() => setView('fav')}>
            ★ お気に入り {d.favorites.length}
          </button>
          <button type="button" className={view === 'used' ? 'on' : ''} onClick={() => setView('used')}>
            使ったネタ
          </button>
          <button type="button" className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>
            全ネタ {netas.length}
          </button>
          <button type="button" className={view === 'zukan' ? 'on' : ''} onClick={() => setView('zukan')}>
            📷 図鑑 {collected.size}/{spots.length}
          </button>
        </div>
        <input className="search" type="search" placeholder="キーワードで検索" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {view === 'zukan' ? (
        <div className="stack">
          <p className="muted small">クイズの「写真当て」で正解すると、写真がカラーになって説明が見られるようになります。</p>
          {AREAS.map((a) => (
            <details key={a} className="block" open={a === '北海道'}>
              <summary>
                <strong>{a}</strong>{' '}
                <span className="muted small">
                  {prefectures.filter((p) => p.area === a).flatMap((p) => spotsOf(p.id)).filter((sp) => collected.has(sp.id)).length}/
                  {prefectures.filter((p) => p.area === a).flatMap((p) => spotsOf(p.id)).length}
                </span>
              </summary>
              {prefectures
                .filter((p) => p.area === a)
                .map((p) => (
                  <div key={p.id} className="zukan-pref">
                    <h4>{p.name.ja}</h4>
                    <div className="spot-grid">
                      {spotsOf(p.id)
                        .filter((sp) => !q || (sp.name + sp.desc).includes(q))
                        .map((sp) => (
                          <SpotCard key={sp.id} spot={sp} locked={!collected.has(sp.id)} onClick={() => nav({ tab: 'map', pref: p.id })} />
                        ))}
                    </div>
                  </div>
                ))}
            </details>
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
