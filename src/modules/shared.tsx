import { useMemo } from 'react';
import { buildFunction, fmt, type FnBundle } from '../math/expr';
import { analyze, type Analysis } from '../math/analysis';
import type { Pt, Band } from '../components/Graph';

export function useAnalysis(expr: string, a: number, b: number): { fb: FnBundle; an: Analysis | null } {
  return useMemo(() => {
    const fb = buildFunction(expr);
    if (fb.error) return { fb, an: null };
    return { fb, an: analyze(fb.f, fb.d1, fb.d2, a, b) };
  }, [expr, a, b]);
}

export const COLORS = { f: '#38bdf8', d1: '#f472b6', d2: '#a3e635', tan: '#facc15', max: '#fb923c', min: '#22d3ee', infl: '#c084fc', bad: '#f87171' };

export function featurePoints(an: Analysis | null, which: 'f' | 'd1' | 'd2', fb: FnBundle): Pt[] {
  if (!an) return [];
  const g = which === 'f' ? fb.f : which === 'd1' ? fb.d1 : fb.d2;
  const pts: Pt[] = [];
  for (const c of an.criticals) {
    const y = which === 'f' ? c.y : g(c.x);
    const color = c.kind === 'local max' ? COLORS.max : c.kind === 'local min' ? COLORS.min : '#94a3b8';
    pts.push({ x: c.x, y: Number.isFinite(y) ? y : 0, color, r: 5, hollow: c.kind === 'neither' || !Number.isFinite(y), label: which === 'f' ? (c.kind === 'neither' ? 'crit (no ext.)' : c.kind.replace('local ', '')) : undefined });
  }
  for (const i of an.inflections) {
    const y = which === 'f' ? i.y : g(i.x);
    pts.push({ x: i.x, y: Number.isFinite(y) ? y : 0, color: COLORS.infl, r: 4, hollow: !i.isInflection, label: which === 'f' && i.isInflection ? 'infl' : undefined });
  }
  return pts;
}

export function monoBands(an: Analysis | null): Band[] {
  return an ? an.monotonic.filter((i) => i.sign !== 0).map((i) => ({ a: i.a, b: i.b, color: i.sign > 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)' })) : [];
}
export function concBands(an: Analysis | null): Band[] {
  return an ? an.concavity.filter((i) => i.sign !== 0).map((i) => ({ a: i.a, b: i.b, color: i.sign > 0 ? 'rgba(56,189,248,0.10)' : 'rgba(250,204,21,0.10)' })) : [];
}

export function AnalysisSummary({ an }: { an: Analysis }) {
  return (
    <ul className="facts">
      {an.criticals.map((c, i) => (
        <li key={'c' + i}>
          <b>x = {fmt(c.x)}</b>: {c.reason}. f′ goes {sg(c.leftSign)} → {sg(c.rightSign)} ⇒ <b>{c.kind}</b>
          {c.reason === "f'=0" && <> · 2nd-deriv test: f″ = {fmt(c.d2)} ⇒ {c.secondTest}</>}
        </li>
      ))}
      {an.inflections.map((p, i) => (
        <li key={'i' + i}><b>x = {fmt(p.x)}</b>: {p.reason}; f″ goes {sg(p.leftSign)} → {sg(p.rightSign)} ⇒ {p.isInflection ? <b>inflection point</b> : <b>NOT an inflection (concavity doesn't change)</b>}</li>
      ))}
      {an.discontinuities.map((d, i) => <li key={'d' + i}><b>x ≈ {fmt(d.x)}</b>: {d.type} — f is not defined/continuous here, so this is <i>not</i> a critical number, but intervals split here.</li>)}
      {an.undefinedRegions.map((r, i) => <li key={'u' + i}>f is undefined on ≈ [{fmt(r.a)}, {fmt(r.b)}] (outside the domain).</li>)}
      {an.endpoints.map((e, i) => <li key={'e' + i}>Endpoint x = {fmt(e.x)}: f = {fmt(e.y)} ({e.kind} relative to nearby points)</li>)}
      {an.absMax && an.absMin && <li>On this closed interval: <b>absolute max</b> {fmt(an.absMax.y)} at x = {fmt(an.absMax.x)}, <b>absolute min</b> {fmt(an.absMin.y)} at x = {fmt(an.absMin.x)}.</li>}
    </ul>
  );
}
const sg = (s: number) => (s > 0 ? '+' : s < 0 ? '−' : '0');

export function NumericNote({ symbolic }: { symbolic: boolean }) {
  return <p className="note">{symbolic ? '✔ f′ and f″ computed symbolically (mathjs). ' : '⚠ f′ and f″ are NUMERIC central-difference approximations. '}
    Critical/inflection locations are found <b>numerically</b> (grid + bisection/golden-section, ~6 decimals).</p>;
}
