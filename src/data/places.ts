import type { City, Spot } from '../types';
import { COORD_OVERRIDES, SPOTS } from './jp/spots';
import { CITIES } from './jp/cities';
import wiki from './jp/wiki.generated.json';
import { prefectures } from './index';
import { prefId } from './jp/define';

type WikiEntry = { title: string; lat?: number; lon?: number; image?: Spot['image'] };
const W = wiki as Record<string, WikiEntry>;

export const spots: Spot[] = Object.entries(SPOTS).flatMap(([code, rows]) =>
  rows.map(([category, name, desc, title], i) => {
    const w = W[title ?? name];
    const o = COORD_OVERRIDES[title ?? name];
    const lat = o?.[0] ?? w?.lat;
    const lon = o?.[1] ?? w?.lon;
    return {
      id: `${prefId(Number(code))}-s${i + 1}`,
      regionId: prefId(Number(code)),
      category,
      name,
      desc,
      wiki: w?.title ?? title ?? name,
      // 名産品は「場所」ではないのでピンを出さない
      lat: category === '名産' ? undefined : lat,
      lon: category === '名産' ? undefined : lon,
      image: w?.image,
    };
  }),
);

export const spotById = new Map(spots.map((s) => [s.id, s]));
export const spotsOf = (regionId: string) => spots.filter((s) => s.regionId === regionId);

const capitals: City[] = prefectures.flatMap((p) => {
  const name = p.capital!.ja.replace(/\(.*\)$/, '');
  const w = W[name];
  return w?.lat !== undefined ? [{ id: `${p.id}-c0`, regionId: p.id, name, kind: 'capital' as const, lat: w.lat, lon: w.lon! }] : [];
});

const others: City[] = CITIES.flatMap(([code, name, kind, title], i) => {
  const w = W[title ?? name];
  return w?.lat !== undefined ? [{ id: `${prefId(code)}-c${i + 1}`, regionId: prefId(code), name, kind, lat: w.lat, lon: w.lon! }] : [];
});

export const cities: City[] = [...capitals, ...others];

export const wikiUrl = (title: string) => `https://ja.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
