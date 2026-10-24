import type { ReactNode } from 'react';
import type { Interval } from '../math/analysis';
import { fmt } from '../math/expr';

export function Slider(p: { label: ReactNode; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="slider">
      <span className="slider-label">{p.label} <b>{fmt(p.value, 3)}{p.unit ?? ''}</b></span>
      <input type="range" min={p.min} max={p.max} step={p.step ?? (p.max - p.min) / 200} value={p.value}
        onChange={(e) => p.onChange(parseFloat(e.target.value))} />
    </label>
  );
}

export function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={'card ' + (className ?? '')}>{title && <h3>{title}</h3>}{children}</section>;
}

export function Badge({ children, kind = 'info' }: { children: ReactNode; kind?: 'info' | 'warn' | 'ok' | 'bad' }) {
  return <span className={'badge ' + kind}>{children}</span>;
}

/** Live sign chart: number line split at key x-values with +/− per interval. */
export function SignChart({ label, intervals, marks, posText, negText }: { label: ReactNode; intervals: Interval[]; marks: { x: number; text?: string }[]; posText: string; negText: string }) {
  if (!intervals.length) return null;
  const a = intervals[0].a, b = intervals[intervals.length - 1].b;
  const pct = (x: number) => ((x - a) / (b - a)) * 100;
  return (
    <div className="signchart">
      <div className="sc-label">{label}</div>
      <div className="sc-bar">
        {intervals.map((iv, i) => (
          <div key={i} className={'sc-seg ' + (iv.sign > 0 ? 'pos' : iv.sign < 0 ? 'neg' : 'zero')} style={{ left: pct(iv.a) + '%', width: pct(iv.b) - pct(iv.a) + '%' }}
            title={`(${fmt(iv.a)}, ${fmt(iv.b)})`}>
            <span>{iv.sign > 0 ? '+' : iv.sign < 0 ? '−' : '∅'}</span>
            <small>{iv.sign > 0 ? posText : iv.sign < 0 ? negText : ''}</small>
          </div>
        ))}
        {marks.map((m, i) => <div key={i} className="sc-mark" style={{ left: pct(m.x) + '%' }}><span>{m.text ?? fmt(m.x, 2)}</span></div>)}
      </div>
    </div>
  );
}

export function intervalText(iv: Interval[], sign: number) {
  const s = iv.filter((i) => i.sign === sign).map((i) => `(${fmt(i.a, 3)}, ${fmt(i.b, 3)})`);
  return s.length ? s.join(' ∪ ') : 'none';
}
