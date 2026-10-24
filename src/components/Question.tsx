import { useState, type ReactNode } from 'react';
import { evaluate } from 'mathjs';
import { TeX } from './TeX';
import { progress, type Concept } from '../state/progress';

/** Text with inline $tex$ segments. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return <>{parts.map((p, i) => (p.startsWith('$') && p.endsWith('$') && p.length > 1 ? <TeX key={i}>{p.slice(1, -1)}</TeX> : <span key={i}>{p}</span>))}</>;
}

export interface Question {
  id: string;
  prompt: string;
  kind: 'number' | 'list' | 'choice';
  answer: number | number[] | string;
  choices?: string[];
  tol?: number;
  /** plain-language mistake explanation (shown first) */
  plain: string;
  /** formal terminology (shown after the plain explanation) */
  formal?: string;
  /** shown after a correct answer before moving on */
  after?: string;
  hint?: string;
  concept?: Concept;
}

export function parseNum(s: string): number {
  const t = s.trim().replace(/π/g, 'pi').replace(/−/g, '-');
  if (!t) return NaN;
  try { const v = evaluate(t); return typeof v === 'number' ? v : NaN; } catch { return NaN; }
}
export function parseList(s: string): number[] | null {
  const t = s.trim().toLowerCase();
  if (t === 'none' || t === '' || t === '-' || t === 'no') return [];
  const v = t.split(/[,;]+/).map(parseNum);
  return v.some((x) => !Number.isFinite(x)) ? null : v.sort((a, b) => a - b);
}

export function checkAnswer(q: Question, raw: string): boolean {
  const tol = q.tol ?? 0.02;
  if (q.kind === 'choice') return raw === q.answer;
  if (q.kind === 'number') { const v = parseNum(raw); const a = q.answer as number; return Number.isFinite(v) && Math.abs(v - a) <= tol * Math.max(1, Math.abs(a)); }
  const v = parseList(raw); const a = [...(q.answer as number[])].sort((p, r) => p - r);
  return !!v && v.length === a.length && v.every((x, i) => Math.abs(x - a[i]) <= tol * Math.max(1, Math.abs(a[i])));
}

export function answerText(q: Question): string {
  if (q.kind === 'choice') return String(q.answer);
  if (q.kind === 'number') return String(+(q.answer as number).toFixed(4));
  const a = q.answer as number[]; return a.length ? a.map((x) => +x.toFixed(4)).join(', ') : 'none';
}

/** One question: waits for an answer; explains mistakes in plain words, then formally; can reveal after 2 misses. */
export function QuestionBox({ q, onDone, extra }: { q: Question; onDone: (correct: boolean, tries: number) => void; extra?: ReactNode }) {
  const [val, setVal] = useState('');
  const [tries, setTries] = useState(0);
  const [state, setState] = useState<'idle' | 'wrong' | 'right' | 'revealed'>('idle');
  const submit = (raw: string) => {
    if (state === 'right' || state === 'revealed') return;
    if (q.kind === 'list' && parseList(raw) === null) { setState('wrong'); return; }
    const ok = checkAnswer(q, raw);
    const t = tries + 1; setTries(t);
    if (q.concept && t === 1) progress.record(q.concept, ok, ok ? undefined : q.plain);
    if (ok) { setState('right'); onDone(true, t); } else setState('wrong');
  };
  return (
    <div className="qbox">
      <p><Rich text={q.prompt} /></p>
      {extra}
      {q.kind === 'choice' ? (
        <div className="row wrap">{q.choices!.map((c) => <button key={c} onClick={() => { setVal(c); submit(c); }} className={val === c ? (state === 'right' ? 'primary' : '') : ''} disabled={state === 'right' || state === 'revealed'}><Rich text={c} /></button>)}</div>
      ) : (
        <form className="row wrap" onSubmit={(e) => { e.preventDefault(); submit(val); }}>
          <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={q.kind === 'list' ? 'e.g. -1, 2  (or none)' : 'number, e.g. 3/2 or pi/4'} aria-label="answer" disabled={state === 'right' || state === 'revealed'} inputMode="text" />
          <button className="primary" type="submit" disabled={state === 'right' || state === 'revealed'}>Check</button>
        </form>
      )}
      {state === 'wrong' && (
        <div className="feedback badf">
          <p>✗ Not quite. <b>In plain words:</b> <Rich text={q.plain} /></p>
          {q.formal && <p><b>Formally:</b> <Rich text={q.formal} /></p>}
          {q.hint && tries >= 1 && <p>Hint: <Rich text={q.hint} /></p>}
          {tries >= 2 && <button onClick={() => { setState('revealed'); onDone(false, tries); }}>Show me this answer & continue</button>}
        </div>
      )}
      {(state === 'right' || state === 'revealed') && (
        <div className={'feedback ' + (state === 'right' ? 'good' : 'badf')}>
          {state === 'right' ? '✔ Correct!' : <>Answer: <b>{answerText(q)}</b>.</>} {q.after && <Rich text={q.after} />}
        </div>
      )}
    </div>
  );
}

/** Runs a list of questions one microstep at a time, never showing future steps. */
export function StepRunner({ steps, lessonId, onFinish, render }: { steps: Question[]; lessonId?: string; onFinish?: () => void; render?: (i: number) => ReactNode }) {
  const saved = lessonId ? progress.get().lessons[lessonId] : undefined;
  void saved;
  const [cur, setCur] = useState(0);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const advance = (i: number) => {
    setDone((d) => ({ ...d, [i]: true }));
    const next = i + 1;
    if (lessonId) progress.update((p) => { p.lessons[lessonId] = { step: next, done: next >= steps.length }; return p; });
    if (next < steps.length) setTimeout(() => setCur(next), 0); else onFinish?.();
  };
  return (
    <div>
      <div className="note">Step {Math.min(cur + 1, steps.length)} of {steps.length}</div>
      {steps.slice(0, cur + 1).map((q, i) => (
        <div key={q.id} className={'step ' + (i === cur && !done[i] ? 'current' : 'done')}>
          {render?.(i)}
          <QuestionBox q={q} onDone={() => advance(i)} />
        </div>
      ))}
      {done[steps.length - 1] && <div className="feedback good">🎉 All steps complete.</div>}
    </div>
  );
}
