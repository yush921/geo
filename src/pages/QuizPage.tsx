import { useMemo, useState } from 'react';
import JapanMap from '../components/JapanMap';
import { AREAS, capitalDiffers, netaById, netasOf, prefectures, regionById } from '../data';
import { makeQuiz, pick, type Question, type QuizMode } from '../lib/quiz';
import { getUserData, recordAnswer, toggleFavorite, useUserData } from '../lib/store';

const MODES: { id: QuizMode; label: string; desc: string }[] = [
  { id: 'loc', label: '位置当て', desc: '地図をタップして答える' },
  { id: 'cap', label: '県庁所在地', desc: `県名と違う${prefectures.filter(capitalDiffers).length}道県` },
  { id: 'neta', label: 'ネタ当て', desc: 'どこの話か当てる' },
];

type Answer = { chosen: string; ok: boolean };

export default function QuizPage() {
  const d = useUserData();
  const [modes, setModes] = useState<QuizMode[]>(['loc', 'cap', 'neta']);
  const [area, setArea] = useState('all');
  const [qs, setQs] = useState<Question[] | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const start = () => {
    setQs(makeQuiz(getUserData(), modes, area, 10));
    setI(0);
    setAnswers([]);
  };

  const q = qs?.[i];
  const ans = answers[i];

  const answer = (regionId: string) => {
    if (!q || ans) return;
    const ok = regionId === q.regionId;
    recordAnswer(q.key, ok);
    setAnswers([...answers, { chosen: regionId, ok }]);
  };

  // 解説として見せるネタ(ネタ当てならそのネタ、それ以外はその県のネタからランダム)
  const followNeta = useMemo(() => {
    if (!q) return undefined;
    if (q.netaId) return netaById.get(q.netaId);
    return pick(netasOf(q.regionId));
  }, [q]);

  if (!qs) {
    const dueCount = Object.values(d.srs).filter((s) => s.due <= Date.now()).length;
    return (
      <div className="narrow">
        <h2>クイズ</h2>
        <p className="muted">間違えた問題や忘れかけの問題を優先して、10問出題します。{dueCount > 0 && `(復習待ち: ${dueCount}問)`}</p>
        <div className="block">
          <h3>出題形式</h3>
          <div className="options">
            {MODES.map((m) => (
              <label key={m.id} className="option">
                <input
                  type="checkbox"
                  checked={modes.includes(m.id)}
                  onChange={(e) =>
                    setModes(e.target.checked ? [...modes, m.id] : modes.filter((x) => x !== m.id))
                  }
                />
                <span>
                  <strong>{m.label}</strong>
                  <span className="muted small"> {m.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="block">
          <h3>範囲</h3>
          <div className="seg wrap">
            {['all', ...AREAS].map((a) => (
              <button key={a} type="button" className={area === a ? 'on' : ''} onClick={() => setArea(a)}>
                {a === 'all' ? '全国' : a}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="primary big" disabled={!modes.length} onClick={start}>
          スタート
        </button>
      </div>
    );
  }

  if (!q) {
    const okCount = answers.filter((a) => a.ok).length;
    return (
      <div className="narrow">
        <h2>結果</h2>
        <p className="score">
          {okCount} / {qs.length} 問正解
        </p>
        <ul className="result-list">
          {qs.map((x, k) => (
            <li key={x.key} className={answers[k]?.ok ? 'ok' : 'ng'}>
              {answers[k]?.ok ? '○' : '×'} {x.mode === 'neta' ? x.prompt : x.prompt.replace('?', '')}
              <span className="muted"> → {x.mode === 'cap' ? regionById.get(x.regionId)?.capital?.ja : regionById.get(x.regionId)?.name.ja}</span>
            </li>
          ))}
        </ul>
        <div className="row">
          <button type="button" className="primary" onClick={start}>
            もう一度
          </button>
          <button type="button" className="ghost" onClick={() => setQs(null)}>
            設定に戻る
          </button>
        </div>
      </div>
    );
  }

  const correct = regionById.get(q.regionId)!;
  const marks: Record<string, 'ok' | 'ng' | 'hint'> = {};
  if (ans) {
    marks[q.regionId] = 'ok';
    if (!ans.ok) marks[ans.chosen] = 'ng';
  } else if (q.mode === 'cap') {
    marks[q.regionId] = 'hint';
  }

  return (
    <div className="split">
      <section className="split-map">
        <div className="quiz-q">
          <p className="muted small">
            {i + 1} / {qs.length} · {MODES.find((m) => m.id === q.mode)?.label}
          </p>
          <p className="quiz-prompt">{q.prompt}</p>
          {q.sub && <p className="muted small">{q.sub}</p>}
        </div>
        <JapanMap
          onSelect={q.mode === 'loc' ? answer : undefined}
          marks={marks}
          showLabels={!!ans}
          resetKey={q.key}
          ariaLabel="クイズ用の日本地図"
        />
      </section>
      <section className="split-panel">
        {q.choices && (
          <div className="choices">
            {q.choices.map((c) => {
              const state = ans ? (c.regionId === q.regionId ? 'ok' : c.regionId === ans.chosen ? 'ng' : '') : '';
              return (
                <button key={c.regionId} type="button" className={`choice ${state}`} disabled={!!ans} onClick={() => answer(c.regionId)}>
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
        {!ans && q.mode === 'loc' && <p className="muted">地図上の{correct.name.ja}をタップ(拡大もできます)</p>}
        {ans && (
          <div className={`feedback ${ans.ok ? 'ok' : 'ng'}`}>
            <p className="feedback-title">
              {ans.ok ? '正解!' : `不正解… 正解は ${q.mode === 'cap' ? correct.capital?.ja : correct.name.ja}`}
            </p>
            {followNeta && (
              <div className="feedback-neta">
                <p className="muted small">💡 人に話したくなる一言({correct.name.ja})</p>
                <p className="neta-one">{followNeta.oneLiner}</p>
                <p className="neta-detail">{followNeta.detail}</p>
                <button type="button" className="ghost" onClick={() => toggleFavorite(followNeta.id)}>
                  {d.favorites.includes(followNeta.id) ? '★ ネタ帳に追加済み' : '☆ ネタ帳に追加'}
                </button>
              </div>
            )}
            <button type="button" className="primary big" onClick={() => setI(i + 1)} autoFocus>
              {i + 1 < qs.length ? '次の問題 →' : '結果を見る'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
