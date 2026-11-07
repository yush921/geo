import { useState } from 'react';

/** 表示設定など、端末ごとに覚えておけば十分な値(保存できない環境でも動く) */
export function usePersisted<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`chizuneta:ui:${key}`);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });
  const set = (nv: T) => {
    setV(nv);
    try {
      localStorage.setItem(`chizuneta:ui:${key}`, JSON.stringify(nv));
    } catch {
      /* noop */
    }
  };
  return [v, set];
}
