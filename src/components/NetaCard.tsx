import { useState } from 'react';
import type { Neta } from '../types';
import { regionById } from '../data';
import { markUsed, setMemo, toggleFavorite, toggleKnown, useUserData } from '../lib/store';

interface Props {
  neta: Neta;
  showRegion?: boolean;
  compact?: boolean;
  onRegionClick?: (regionId: string) => void;
}

export default function NetaCard({ neta, showRegion, compact, onRegionClick }: Props) {
  const d = useUserData();
  const fav = d.favorites.includes(neta.id);
  const known = d.known.includes(neta.id);
  const used = d.used[neta.id] ?? 0;
  const [open, setOpen] = useState(!compact);
  const [editing, setEditing] = useState(false);
  const memo = d.memos[neta.id] ?? '';

  return (
    <article className={`neta ${compact ? 'neta--compact' : ''}`}>
      <header className="neta-head">
        <span className={`tag tag-${neta.type}`}>{neta.type}</span>
        {showRegion &&
          neta.targets.map((id) => (
            <button key={id} type="button" className="chip-link" onClick={() => onRegionClick?.(id)}>
              {regionById.get(id)?.name.ja}
            </button>
          ))}
        {neta.year && <span className="muted small">{neta.year}年時点</span>}
        {!neta.reviewed && (
          <span className="muted small" title="AIによる下書きです。事実関係は未確認です">
            未確認
          </span>
        )}
      </header>
      <p className="neta-one" onClick={() => compact && setOpen(!open)}>
        {neta.oneLiner}
      </p>
      {open && <p className="neta-detail">{neta.detail}</p>}
      {open && memo && !editing && <p className="neta-memo">📝 {memo}</p>}
      {editing && (
        <textarea
          className="memo-input"
          defaultValue={memo}
          autoFocus
          placeholder="自分用のメモ(どんな場面で使ったか、相手の反応など)"
          onBlur={(e) => {
            setMemo(neta.id, e.target.value);
            setEditing(false);
          }}
        />
      )}
      <footer className="neta-actions">
        <button type="button" className={fav ? 'on' : ''} onClick={() => toggleFavorite(neta.id)} aria-pressed={fav}>
          {fav ? '★ ネタ帳' : '☆ ネタ帳'}
        </button>
        <button type="button" className={known ? 'on' : ''} onClick={() => toggleKnown(neta.id)} aria-pressed={known}>
          {known ? '✓ 知ってた' : '知ってた'}
        </button>
        <button type="button" onClick={() => markUsed(neta.id)} title="会話で使ったら記録">
          使った{used ? ` ×${used}` : ''}
        </button>
        <button type="button" onClick={() => setEditing(true)}>
          メモ
        </button>
        {compact && (
          <button type="button" className="ghost" onClick={() => setOpen(!open)}>
            {open ? '閉じる' : '詳しく'}
          </button>
        )}
      </footer>
    </article>
  );
}
