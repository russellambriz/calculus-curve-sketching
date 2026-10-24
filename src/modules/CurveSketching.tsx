import { useMemo, useState } from 'react';
import { Graph, autoY } from '../components/Graph';
import { TeX } from '../components/TeX';
import { Card, Badge } from '../components/ui';
import { StepRunner, type Question } from '../components/Question';
import { fmt } from '../math/expr';
import { strokeToFn, compareSketch, type SketchFeedback } from '../math/sketchCompare';
import { progress, useProgress } from '../state/progress';
import { useAnalysis, COLORS, AnalysisSummary, NumericNote } from './shared';
import type { Analysis } from '../math/analysis';

interface Ex { id: string; name: string; family: string; expr: string; a: number; b: number }
const r = (n: number) => Math.round(n);
function randomCubic(seed: number): Ex {
  // f'(x) = k (x - p)(x - q) with integer p<q  =>  f = k(x^3/3 - (p+q)x^2/2 + pq x)
  const rnd = (i: number) => { const s = Math.sin(seed * 9301 + i * 49297) * 233280; return s - Math.floor(s); };
  const p = r(rnd(1) * 4) - 3, q = p + 1 + r(rnd(2) * 3), k = rnd(3) > 0.5 ? 1 : -1;
  const expr = `${k}*(x^3/3 - ${(p + q) / 2}*x^2 + ${p * q}*x)`;
  return { id: 'rc' + seed, name: `Random cubic #${seed}`, family: 'polynomial', expr, a: p - 1.5, b: q + 1.5 };
}
const BASE: Ex[] = [
  { id: 'p1', name: 'x³ − 3x²', family: 'polynomial', expr: 'x^3 - 3*x^2', a: -1.5, b: 3.6 },
  { id: 'p2', name: 'x⁴ − 2x²', family: 'polynomial', expr: 'x^4 - 2*x^2', a: -1.9, b: 1.9 },
  { id: 'r1', name: 'x / (x² + 1)', family: 'rational', expr: 'x/(x^2+1)', a: -5, b: 5 },
  { id: 'r2', name: 'x² / (x − 1)', family: 'rational', expr: 'x^2/(x-1)', a: -3, b: 4.2 },
  { id: 'e1', name: 'x·e^(−x)', family: 'exponential', expr: 'x*exp(-x)', a: -0.8, b: 5 },
  { id: 'e2', name: 'e^(−x²/2)', family: 'exponential', expr: 'exp(-x^2/2)', a: -3.5, b: 3.5 },
  { id: 't1', name: 'sin x + cos x on [0, 2π]', family: 'trigonometric', expr: 'sin(x) + cos(x)', a: 0, b: 2 * Math.PI },
  { id: 't2', name: 'x + 2 sin x on [0, 2π]', family: 'trigonometric', expr: 'x + 2*sin(x)', a: 0, b: 2 * Math.PI },
];

function buildSteps(an: Analysis, f: (x: number) => number, d2: (x: number) => number): Question[] {
  const crit = an.criticals, infl = an.inflections.filter((i) => i.isInflection);
  const steps: Question[] = [];
  const vaNote = an.discontinuities.length ? ` (Remember x = ${an.discontinuities.map((d) => fmt(d.x)).join(', ')} is NOT in the domain.)` : '';
  steps.push({ id: 'crit', concept: 'critical', kind: 'list', answer: crit.map((c) => c.x), tol: 0.01,
    prompt: `Step 1 — Critical numbers. Find every x in the window where $f'(x)=0$ or $f'(x)$ is undefined (with f defined). Enter a comma-separated list (exact forms like pi/4 or sqrt(2) are fine), or "none".${vaNote}`,
    plain: 'Critical numbers are the x-values where the curve is momentarily flat (slope 0) or has a sharp corner/cusp. Set your f′ equal to 0 and solve; also look where f′ has a zero denominator but f itself is defined.',
    formal: 'c is a critical number of f if c is in the domain of f and f′(c)=0 or f′(c) does not exist.',
    after: `Critical numbers: ${crit.length ? crit.map((c) => fmt(c.x)).join(', ') : 'none'}.` });
  crit.forEach((c, i) => steps.push({ id: 'fdt' + i, concept: 'firstTest', kind: 'choice', answer: c.kind, choices: ['local max', 'local min', 'neither'],
    prompt: `Step — First derivative test at x = ${fmt(c.x)}. Left of it f′ is ${c.leftSign > 0 ? 'positive' : 'negative'}, right of it f′ is ${c.rightSign > 0 ? 'positive' : 'negative'}. What happens at x = ${fmt(c.x)}?`,
    plain: 'Think of walking: positive f′ = uphill, negative = downhill. Uphill then downhill means you passed a peak. Downhill then uphill is a valley. If the sign doesn\'t change you just paused on flat ground.',
    formal: 'First Derivative Test: f′ changes + → − ⇒ local max; − → + ⇒ local min; no sign change ⇒ no local extremum.',
    after: `f′: ${c.leftSign > 0 ? '+' : '−'} → ${c.rightSign > 0 ? '+' : '−'} ⇒ ${c.kind}.` }));
  crit.filter((c) => c.reason === "f'=0").forEach((c, i) => steps.push({ id: 'sdt' + i, concept: 'secondTest', kind: 'choice', answer: c.secondTest, choices: ['local max', 'local min', 'inconclusive'],
    prompt: `Step — Second derivative test at x = ${fmt(c.x)}: $f''(${fmt(c.x)}) = ${fmt(d2(c.x))}$. What does the second derivative test conclude?`,
    plain: 'If the curve is shaped like a cup (f″>0) at a flat spot, the flat spot is the bottom of the cup — a min. A cap shape (f″<0) means a top — a max. If f″ = 0, the test cannot tell you; use the first derivative test instead.',
    formal: "If f′(c)=0 and f″(c)>0 ⇒ local min; f″(c)<0 ⇒ local max; f″(c)=0 ⇒ inconclusive." }));
  steps.push({ id: 'infl', concept: 'inflection', kind: 'list', answer: infl.map((p) => p.x), tol: 0.01,
    prompt: 'Step — Inflection points. Enter the x-values where the concavity actually changes (f″ changes sign), or "none".',
    plain: 'An inflection is where the curve switches from bending like a cup to bending like a cap (or back). Solve f″ = 0 (and where f″ is undefined) to get candidates, then check that the sign of f″ really flips.',
    formal: 'f has an inflection point at c if f is continuous at c and f″ changes sign at c.',
    after: an.inflections.some((p) => !p.isInflection) ? `Note: f″ = 0 at ${an.inflections.filter((p) => !p.isInflection).map((p) => fmt(p.x)).join(', ')} but its sign doesn't change, so those are NOT inflections.` : undefined });
  const conc = an.concavity.filter((c) => c.sign !== 0);
  conc.slice(0, 4).forEach((iv, i) => steps.push({ id: 'conc' + i, concept: 'concavity', kind: 'choice', answer: iv.sign > 0 ? 'concave up ∪' : 'concave down ∩', choices: ['concave up ∪', 'concave down ∩'],
    prompt: `Step — Concavity on (${fmt(iv.a, 3)}, ${fmt(iv.b, 3)}). Test a point: $f''(${fmt((iv.a + iv.b) / 2, 2)}) = ${fmt(d2((iv.a + iv.b) / 2))}$. Which is it?`,
    plain: 'Positive f″ means the slope is increasing — the curve holds water like a cup. Negative means it spills like an upside-down cup.',
    formal: 'f″>0 on I ⇒ f concave up on I; f″<0 on I ⇒ concave down.' }));
  [...crit.map((c) => c.x), ...infl.map((p) => p.x)].slice(0, 4).forEach((x, i) => steps.push({ id: 'val' + i, concept: 'derivative', kind: 'number', answer: f(x), tol: 0.01,
    prompt: `Step — Function value. Compute $f(${fmt(x)})$ so you know how high to draw this key point.`,
    plain: 'Plug the x-value into the ORIGINAL f (not f′). This tells you where the dot goes vertically.', formal: 'The point on the graph is (c, f(c)).' }));
  return steps;
}

export default function CurveSketching() {
  const [seed, setSeed] = useState(1);
  const exercises = useMemo(() => [...BASE, randomCubic(seed)], [seed]);
  const [ei, setEi] = useState(0);
  const ex = exercises[ei];
  const { fb, an } = useAnalysis(ex.expr, ex.a, ex.b);
  const [phase, setPhase] = useState<'steps' | 'draw'>('steps');
  const [stroke, setStroke] = useState<[number, number][][]>([]);
  const [fbk, setFbk] = useState<SketchFeedback | null>(null);
  const [reveal, setReveal] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [runKey, setRunKey] = useState(0);
  const prog = useProgress();
  const y = autoY([fb.f], [ex.a, ex.b]);
  const steps = useMemo(() => (an ? buildSteps(an, fb.f, fb.d2) : []), [an, fb]);

  const choose = (i: number) => { setEi(i); setPhase('steps'); setStroke([]); setFbk(null); setReveal(false); setRunKey((k) => k + 1); };
  const all = stroke.flat();
  const check = () => {
    if (!an) return;
    const { fn, covered } = strokeToFn(all, ex.a, ex.b);
    const res = compareSketch(fn, fb.f, an, y[1] - y[0], covered);
    setFbk(res);
    progress.update((p) => { p.sketches[ex.id] = Math.max(p.sketches[ex.id] ?? 0, res.score); return p; });
  };
  const keyPts = an ? [...an.criticals.map((c) => ({ x: c.x, y: c.y, color: c.kind === 'local max' ? COLORS.max : c.kind === 'local min' ? COLORS.min : '#94a3b8', label: c.kind === 'neither' ? 'crit' : c.kind.replace('local ', '') })),
    ...an.inflections.filter((i) => i.isInflection).map((i) => ({ x: i.x, y: i.y, color: COLORS.infl, label: 'infl' }))] : [];

  return (
    <div className="module">
      <Card title="2 · Curve Sketching Laboratory">
        <div className="row wrap">
          <select value={ei} onChange={(e) => choose(+e.target.value)} aria-label="exercise">
            {exercises.map((e, i) => <option key={e.id} value={i}>[{e.family}] {e.name}{prog.sketches[e.id] !== undefined ? ` — best ${prog.sketches[e.id]}%` : ''}</option>)}
          </select>
          <button onClick={() => { setSeed(seed + 1); setEi(exercises.length - 1); setPhase('steps'); setStroke([]); setFbk(null); setReveal(false); setRunKey((k) => k + 1); }}>🎲 New random cubic</button>
          <div className="tabs" style={{ margin: 0 }}>
            <button className={phase === 'steps' ? 'active' : ''} onClick={() => setPhase('steps')}>A. Analyze</button>
            <button className={phase === 'draw' ? 'active' : ''} onClick={() => setPhase('draw')}>B. Reconstruct (draw)</button>
          </div>
        </div>
        <TeX block>{`f(x)=${fb.tex}\\qquad x\\in[${fmt(ex.a, 3)},\\,${fmt(ex.b, 3)}]`}</TeX>
      </Card>
      <div className="grid2">
        <div>
          {phase === 'steps' ? (
            <Card title="Guided analysis — one microstep at a time">
              <p className="note">Derivatives are available if you want to check your algebra: <TeX>{`f'(x)=${fb.d1Tex}`}</TeX>, <TeX>{`f''(x)=${fb.d2Tex}`}</TeX>. The answers below are never shown until you reach and attempt each step.</p>
              {an && <StepRunner key={ex.id + runKey} steps={steps} lessonId={'sketch-' + ex.id} onFinish={() => setPhase('draw')} />}
            </Card>
          ) : (
            <Card title="Draw f using only the derivative information">
              <p>Draw with finger, pen, or mouse (multiple strokes OK). Then press <b>Check my sketch</b>.</p>
              <Graph x={[ex.a, ex.b]} y={y} height={340}
                vlines={showHints && an ? [...an.criticals.map((c) => ({ x: c.x, color: '#fb923c' })), ...an.inflections.filter((i) => i.isInflection).map((i) => ({ x: i.x, color: '#c084fc' })), ...an.discontinuities.map((d) => ({ x: d.x, color: '#f87171', dash: '2 2' }))] : []}
                points={showHints ? keyPts : []}
                curves={reveal ? [{ fn: fb.f, color: COLORS.f, width: 2, dash: '6 4' }] : []}
                polylines={stroke.map((s) => ({ pts: s, color: '#facc15', width: 3 }))}
                onDraw={(pts, phaseD) => { setStroke((cur) => phaseD === 'start' ? [...cur, pts] : [...cur.slice(0, -1), pts]); }}
                ariaLabel="drawing area" />
              <div className="row wrap">
                <button className="primary" onClick={check} disabled={!all.length}>Check my sketch</button>
                <button onClick={() => setStroke(stroke.slice(0, -1))}>Undo stroke</button>
                <button onClick={() => { setStroke([]); setFbk(null); }}>Clear</button>
                <label><input type="checkbox" checked={showHints} onChange={(e) => setShowHints(e.target.checked)} /> show key points</label>
                <button onClick={() => setReveal(!reveal)}>{reveal ? 'Hide' : 'Reveal'} true graph</button>
              </div>
              <p className="note">Keyboard users: the analysis steps (tab A) are fully keyboard-accessible; drawing requires a pointer.</p>
            </Card>
          )}
        </div>
        <div>
          {phase === 'draw' && fbk && (
            <Card title={<>Sketch feedback <Badge kind={fbk.score >= 80 ? 'ok' : fbk.score >= 50 ? 'warn' : 'bad'}>{fbk.score}%</Badge></>}>
              <ul className="facts">{fbk.messages.map((m, i) => <li key={i} className={m.ok ? 'ok-text' : 'bad-text'}>{m.text}</li>)}</ul>
              <p className="note">Checks: rising/falling vs sign of f′ on each interval, turning-point locations, bending vs sign of f″ (coarse second differences of your stroke), and heights at key points (±8% of the window).</p>
            </Card>
          )}
          {an && (phase === 'draw') && (
            <Card title="Derivative information (the conditions your sketch must meet)">
              <AnalysisSummary an={an} />
              <NumericNote symbolic={fb.symbolic} />
            </Card>
          )}
          {phase === 'steps' && <Card title="Curve-sketching checklist">
            <ol className="facts"><li>Domain, discontinuities, asymptotes</li><li>Critical numbers (f′=0 or undefined)</li><li>First-derivative test (sign chart of f′) ⇒ increase/decrease, local extrema</li><li>Second-derivative test at f′=0 points</li><li>Concavity & inflection points (sign chart of f″)</li><li>Function values at key points</li><li>Reconstruct the graph</li></ol>
          </Card>}
        </div>
      </div>
    </div>
  );
}
