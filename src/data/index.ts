import type { Neta, Region, TalkProfile } from '../types';
import type { PrefBundle } from './jp/define';
import hokkaidoTohoku from './jp/hokkaido-tohoku';
import kanto from './jp/kanto';
import chubu from './jp/chubu';
import kinki from './jp/kinki';
import chugokuShikoku from './jp/chugoku-shikoku';
import kyushuOkinawa from './jp/kyushu-okinawa';

const bundles: PrefBundle[] = [
  ...hokkaidoTohoku,
  ...kanto,
  ...chubu,
  ...kinki,
  ...chugokuShikoku,
  ...kyushuOkinawa,
].sort((a, b) => (a.region.mapCode ?? 0) - (b.region.mapCode ?? 0));

export const AREAS = ['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州・沖縄'] as const;

export const prefectures: Region[] = bundles.map((b) => b.region);
export const netas: Neta[] = bundles.flatMap((b) => b.neta);

export const regionById = new Map(prefectures.map((r) => [r.id, r]));
export const regionByMapCode = new Map(prefectures.map((r) => [r.mapCode!, r]));
export const talkById = new Map<string, TalkProfile>(bundles.map((b) => [b.region.id, b.talk]));
export const netaById = new Map(netas.map((n) => [n.id, n]));

export function netasOf(regionId: string): Neta[] {
  return netas.filter((n) => n.targets.includes(regionId));
}

/** 「〇〇県」→「〇〇」(北海道はそのまま) */
export function shortName(r: Region): string {
  return r.name.ja === '北海道' ? r.name.ja : r.name.ja.replace(/[都道府県]$/, '');
}

/** 県名と県庁所在地名が違う(=覚える価値がある)か */
export function capitalDiffers(r: Region): boolean {
  if (!r.capital) return false;
  const c = r.capital.ja.replace(/(市|区).*$/, '');
  return c !== shortName(r) && !r.capital.ja.startsWith('さいたま') && !r.capital.ja.startsWith('新宿');
}
