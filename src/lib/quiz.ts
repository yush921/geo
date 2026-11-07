import type { Region } from '../types';
import { capitalDiffers, netas, netasOf, prefectures, regionById, shortName } from '../data';
import type { UserData } from './store';

export type QuizMode = 'loc' | 'cap' | 'neta';

export interface Question {
  key: string; // SRS キー
  mode: QuizMode;
  regionId: string; // 正解の都道府県
  prompt: string;
  sub?: string;
  choices?: { label: string; regionId: string }[]; // 4択の場合
  netaId?: string;
}

export const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

export const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** 都道府県ごとの出題キー(習熟度の計算に使う) */
export function keysOf(r: Region): string[] {
  const keys = [`loc:${r.id}`];
  if (capitalDiffers(r)) keys.push(`cap:${r.id}`);
  netasOf(r.id).forEach((n) => keys.push(`neta:${n.id}`));
  return keys;
}

function distractors(answer: Region, n: number): Region[] {
  const near = prefectures.filter((p) => p.id !== answer.id && p.area === answer.area);
  const far = prefectures.filter((p) => p.id !== answer.id && p.area !== answer.area);
  return shuffle([...shuffle(near).slice(0, 2), ...shuffle(far)]).slice(0, n);
}

/** ネタ文中の県名を伏せる */
function mask(text: string, r: Region): string {
  const names = [r.name.ja, shortName(r)];
  if (r.capital) names.push(r.capital.ja.replace(/\(.*\)/, ''), r.capital.ja.replace(/(市|区).*$/, ''));
  let t = text;
  names
    .filter((s) => s.length >= 2)
    .sort((a, b) => b.length - a.length)
    .forEach((s) => (t = t.split(s).join('〇〇')));
  return t;
}

function build(key: string): Question | null {
  const [mode, id] = key.split(':') as [QuizMode, string];
  if (mode === 'loc') {
    const r = regionById.get(id)!;
    return { key, mode, regionId: id, prompt: `${r.name.ja}はどこ?`, sub: '地図をタップして答えてください' };
  }
  if (mode === 'cap') {
    const r = regionById.get(id)!;
    const others = distractors(r, 3).filter((p) => p.capital);
    const choices = shuffle([r, ...others]).map((p) => ({ label: p.capital!.ja, regionId: p.id }));
    return { key, mode, regionId: id, prompt: `${r.name.ja}の県庁所在地は?`, choices };
  }
  const n = netas.find((x) => x.id === id);
  if (!n) return null;
  const r = regionById.get(n.targets[0])!;
  const choices = shuffle([r, ...distractors(r, 3)]).map((p) => ({ label: p.name.ja, regionId: p.id }));
  return { key, mode: 'neta', regionId: r.id, prompt: mask(n.oneLiner, r), sub: 'これはどこの話?', choices, netaId: n.id };
}

/** 復習が必要なもの → まだ出していないもの → その他、の順で出題する */
export function makeQuiz(d: UserData, modes: QuizMode[], area: string, count = 10): Question[] {
  const scope = prefectures.filter((p) => area === 'all' || p.area === area);
  const keys: string[] = [];
  for (const r of scope) {
    if (modes.includes('loc')) keys.push(`loc:${r.id}`);
    if (modes.includes('cap') && capitalDiffers(r)) keys.push(`cap:${r.id}`);
    if (modes.includes('neta')) netasOf(r.id).forEach((n) => keys.push(`neta:${n.id}`));
  }
  const now = Date.now();
  const due = shuffle(keys.filter((k) => d.srs[k] && d.srs[k].due <= now)).sort(
    (a, b) => d.srs[a].box - d.srs[b].box,
  );
  const unseen = shuffle(keys.filter((k) => !d.srs[k]));
  const rest = shuffle(keys.filter((k) => d.srs[k] && d.srs[k].due > now));
  const chosen = [...due, ...unseen, ...rest].slice(0, count);
  return shuffle(chosen)
    .map(build)
    .filter((q): q is Question => q !== null);
}
