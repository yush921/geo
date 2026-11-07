import { useEffect, useRef } from 'react';
import type { Spot, SpotImage } from '../types';
import { wikiUrl } from '../data/places';

export function Credit({ image }: { image: SpotImage }) {
  return (
    <p className="credit">
      写真:{' '}
      <a href={image.page} target="_blank" rel="noreferrer">
        {image.artist} / {image.license}
      </a>{' '}
      (Wikimedia Commons)
    </p>
  );
}

/** 同梱した写真があればそれを使う */
export const photoUrl = (img: SpotImage) => img.src ?? img.thumb;

const ICON: Record<Spot['category'], string> = { 観光: '📍', 遺産: '🏛', 名産: '🍽' };

export function SpotCard({
  spot,
  active,
  locked,
  onClick,
}: {
  spot: Spot;
  active?: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`spot ${active ? 'is-active' : ''} ${locked ? 'is-locked' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {spot.image ? (
        <img className="spot-img" src={photoUrl(spot.image)} alt={spot.name} loading="lazy" />
      ) : (
        <div className="spot-img" />
      )}
      <span className="spot-body">
        <span className="spot-name">
          {ICON[spot.category]} {spot.name}
        </span>
        {!locked && <span className="spot-desc">{spot.desc}</span>}
      </span>
    </button>
  );
}

export function SpotDetail({ spot, onClose }: { spot: Spot; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  // スマホでは地図の下に出るので、見える位置までスクロールする
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [spot.id]);
  return (
    <div className="block spot-detail" ref={ref}>
      <div className="row-between">
        <h3 style={{ margin: 0 }}>
          {ICON[spot.category]} {spot.category}
        </h3>
        {onClose && (
          <button type="button" className="ghost" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        )}
      </div>
      {spot.image && <img src={photoUrl(spot.image)} alt={spot.name} />}
      <p className="neta-one">{spot.name}</p>
      <p className="neta-detail">{spot.desc}</p>
      <div className="row-between">
        {spot.image ? <Credit image={spot.image} /> : <span />}
        <a className="small" href={wikiUrl(spot.wiki)} target="_blank" rel="noreferrer">
          Wikipediaで詳しく
        </a>
      </div>
    </div>
  );
}
