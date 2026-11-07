import { useSyncExternalStore } from 'react';

/** 間隔反復(Leitner 方式)の1項目 */
export interface SrsItem {
  box: number; // 0〜5
  due: number; // 次に出題する時刻(ms)
  seen: number;
  correct: number;
}

export interface UserData {
  version: 1;
  favorites: string[]; // neta id
  known: string[]; // 「もう知ってた」neta id
  used: Record<string, number>; // 実際に会話で使った回数
  memos: Record<string, string>; // neta id → メモ
  srs: Record<string, SrsItem>; // 例: "loc:jp-13", "cap:jp-01", "neta:jp-13-2"
  streak: { last: string; count: number };
}

const KEY = 'chizuneta:v1';

const empty = (): UserData => ({
  version: 1,
  favorites: [],
  known: [],
  used: {},
  memos: {},
  srs: {},
  streak: { last: '', count: 0 },
});

function load(): UserData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch {
    /* プライベートモードなどでは保存できない */
  }
  return empty();
}

let state: UserData = load();
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 保存できなくてもアプリは動かす */
  }
}

export function update(fn: (d: UserData) => UserData) {
  state = fn(state);
  save();
  listeners.forEach((l) => l());
}

export function useUserData(): UserData {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const getUserData = () => state;

const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

export const toggleFavorite = (id: string) => update((d) => ({ ...d, favorites: toggle(d.favorites, id) }));
export const toggleKnown = (id: string) => update((d) => ({ ...d, known: toggle(d.known, id) }));
export const markUsed = (id: string, delta = 1) =>
  update((d) => ({ ...d, used: { ...d.used, [id]: Math.max(0, (d.used[id] ?? 0) + delta) } }));
export const setMemo = (id: string, text: string) =>
  update((d) => {
    const memos = { ...d.memos };
    if (text.trim()) memos[id] = text;
    else delete memos[id];
    return { ...d, memos };
  });

/* ---------- 間隔反復 ---------- */
const DAY = 24 * 60 * 60 * 1000;
const INTERVALS = [0, 1, 3, 7, 14, 30]; // box ごとの次回出題までの日数

export function recordAnswer(key: string, ok: boolean) {
  update((d) => {
    const cur = d.srs[key] ?? { box: 0, due: 0, seen: 0, correct: 0 };
    const box = ok ? Math.min(5, cur.box + 1) : 0;
    const next: SrsItem = {
      box,
      due: Date.now() + (ok ? INTERVALS[box] * DAY : 10 * 60 * 1000),
      seen: cur.seen + 1,
      correct: cur.correct + (ok ? 1 : 0),
    };
    return { ...d, srs: { ...d.srs, [key]: next }, streak: bumpStreak(d.streak) };
  });
}

export const todayStr = (t = new Date()) =>
  `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;

function bumpStreak(s: UserData['streak']): UserData['streak'] {
  const today = todayStr();
  if (s.last === today) return s;
  const yesterday = todayStr(new Date(Date.now() - DAY));
  return { last: today, count: s.last === yesterday ? s.count + 1 : 1 };
}

/** 習熟度 0〜1(出題キーの box 平均) */
export function mastery(d: UserData, keys: string[]): number {
  if (!keys.length) return 0;
  return keys.reduce((s, k) => s + (d.srs[k]?.box ?? 0), 0) / (keys.length * 5);
}

/* ---------- 端末間の受け渡し ---------- */
export function exportJson(): string {
  return JSON.stringify(state, null, 2);
}

export function importJson(text: string) {
  const parsed = JSON.parse(text);
  if (parsed?.version !== 1) throw new Error('対応していないデータ形式です');
  update(() => ({ ...empty(), ...parsed }));
}

export const resetAll = () => update(() => empty());
