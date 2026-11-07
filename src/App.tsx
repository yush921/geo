import { useEffect, useState } from 'react';
import ExplorePage from './pages/ExplorePage';
import TalkPage from './pages/TalkPage';
import TodayPage from './pages/TodayPage';
import QuizPage from './pages/QuizPage';
import NotebookPage from './pages/NotebookPage';
import { regionById } from './data';

export type Tab = 'map' | 'talk' | 'today' | 'quiz' | 'note';
export interface Route {
  tab: Tab;
  pref: string | null;
}
export type Nav = (r: Route) => void;

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'map', label: '地図', icon: '🗾' },
  { id: 'talk', label: '話すなら', icon: '💬' },
  { id: 'today', label: '今日の1ネタ', icon: '☀️' },
  { id: 'quiz', label: 'クイズ', icon: '❓' },
  { id: 'note', label: 'ネタ帳', icon: '📒' },
];

/** URL のハッシュ(#/map/jp-13 など)と画面を対応させる。戻るボタンやブックマークが使える */
function parse(): Route {
  const [, tab, pref] = location.hash.replace(/^#/, '').split('/');
  const t = TABS.some((x) => x.id === tab) ? (tab as Tab) : 'today';
  return { tab: t, pref: pref && regionById.has(pref) ? pref : null };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parse);

  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const nav: Nav = (r) => {
    location.hash = `/${r.tab}${r.pref ? `/${r.pref}` : ''}`;
  };
  // 地図と「話すなら」を行き来しても、選んでいた県を引き継ぐ
  const [lastPref, setLastPref] = useState<string | null>(route.pref);
  useEffect(() => {
    if (route.pref) setLastPref(route.pref);
  }, [route.pref]);
  const go = (tab: Tab) => nav({ tab, pref: tab === 'map' || tab === 'talk' ? (route.pref ?? lastPref) : null });

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="logo">
          ちずネタ<span className="muted small"> 都道府県</span>
        </h1>
        <nav className="tabs" aria-label="メニュー">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={route.tab === t.id ? 'on' : ''}
              aria-current={route.tab === t.id ? 'page' : undefined}
              onClick={() => go(t.id)}
            >
              <span className="tab-icon" aria-hidden>
                {t.icon}
              </span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>
      <main className="main">
        {route.tab === 'map' && <ExplorePage pref={route.pref} nav={nav} />}
        {route.tab === 'talk' && <TalkPage pref={route.pref} nav={nav} />}
        {route.tab === 'today' && <TodayPage nav={nav} />}
        {route.tab === 'quiz' && <QuizPage />}
        {route.tab === 'note' && <NotebookPage nav={nav} />}
      </main>
    </div>
  );
}
