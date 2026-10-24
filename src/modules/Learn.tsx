import { useEffect, useMemo, useState } from 'react';
import { Graph, autoY } from '../components/Graph';
import { TeX } from '../components/TeX';
import { Card, Badge } from '../components/ui';
import { StepRunner, QuestionBox, type Question, parseNum } from '../components/Question';
import { GENERATORS, mulberry } from '../math/problems';
import { CONCEPTS, progress, useProgress, weakness, type Concept } from '../state/progress';
import { strokeToFn } from '../math/sketchCompare';
import { buildFunction, fmt } from '../math/expr';
import { COLORS } from './shared';

const choice = (id: string, concept: Concept, prompt: string, choices: string[], answer: string, plain: string, formal: string, after?: string): Question => ({ id, concept, kind: 'choice', prompt, choices, answer, plain, formal, after });
const num = (id: string, concept: Concept, prompt: string, answer: number, plain: string, formal: string, after?: string, tol = 0.01): Question => ({ id, concept, kind: 'number', prompt, answer, plain, formal, after, tol });

const LESSONS: { id: string; title: string; expr?: string; dom?: [number, number]; steps: Question[] }[] = [
  { id: 'L1', title: 'Extrema of f(x) = x³ − 6x² + 9x + 1', expr: 'x^3 - 6*x^2 + 9*x + 1', dom: [-0.5, 4.5], steps: [
    num('1', 'derivative', 'Start with the slope. Using the power rule, $f\'(x)=3x^2-12x+9$. What is the slope at $x=2$, i.e. $f\'(2)$?', -3, 'Plug 2 into f′: 3·4 − 12·2 + 9.', 'f′(2) = 12 − 24 + 9.', 'Negative: at x = 2 the graph is going downhill.'),
    { id: '2', concept: 'critical', kind: 'list', answer: [1, 3], tol: 1e-6, prompt: 'Where is the graph flat? Solve $3x^2-12x+9=0$ (comma-separated).', plain: 'Divide everything by 3 first: x² − 4x + 3 = 0. Now find two numbers that multiply to 3 and add to −4.', formal: 'Critical numbers: f′(c) = 0. Factor 3(x − 1)(x − 3).', after: 'Critical numbers x = 1 and x = 3.' },
    choice('3', 'firstTest', 'Test a point left of 1: what is the sign of $f\'(0)$?', ['+', '−'], '+', 'f′(0) = 9. Positive means uphill.', 'Sign of f′ on (−∞, 1).'),
    choice('4', 'firstTest', 'Between the critical numbers: sign of $f\'(2)$? (You computed it in step 1.)', ['+', '−'], '−', 'Look back: f′(2) = −3.', 'Sign of f′ on (1, 3).'),
    choice('5', 'firstTest', 'So at $x=1$ the slope goes + → −. What is there?', ['local max', 'local min', 'neither'], 'local max', 'Going up and then down means you just went over a hilltop.', 'First Derivative Test: + → − ⇒ local maximum.'),
    choice('6', 'firstTest', 'Right of 3, $f\'(4)=9>0$. So at $x=3$ the slope goes − → +. What is there?', ['local max', 'local min', 'neither'], 'local min', 'Down then up = the bottom of a valley.', '− → + ⇒ local minimum.'),
    num('7', 'derivative', 'How high is the hilltop? Compute $f(1)$.', 5, 'Use the ORIGINAL f, not f′: 1 − 6 + 9 + 1.', 'Local max value f(1).'),
    num('8', 'inflection', 'Now the bending: $f\'\'(x)=6x-12$. Where could the concavity switch?', 2, 'Set 6x − 12 = 0.', 'Inflection candidates: f″ = 0 or undefined.', 'f″ < 0 left of 2 (∩) and > 0 right of 2 (∪), so x = 2 IS an inflection point.'),
  ] },
  { id: 'L2', title: 'River field with 600 m of fence', steps: [
    choice('1', 'optimization', 'Two sides of length x go away from the river. With 600 m total, the long side L is…', ['$L=600-x$', '$L=600-2x$', '$L=300-x$'], '$L=600-2x$', 'You spend fence on BOTH side pieces (x and x) and then whatever is left goes to the long side.', 'Constraint: 2x + L = 600.'),
    choice('2', 'optimization', 'Write the area as a function of one variable.', ['$A=x(600-2x)$', '$A=2x+L$', '$A=x^2$'], '$A=x(600-2x)$', 'Area of a rectangle is length × width — substitute L from the constraint so only x remains.', 'Objective function A(x) = 600x − 2x².'),
    choice('3', 'derivative', "$A'(x)$ = ?", ['$600-4x$', '$600-2x$', '$600x-4$'], '$600-4x$', 'Derivative of 600x is 600, derivative of 2x² is 4x.', 'Power rule.'),
    num('4', 'optimization', 'Solve $A\'(x)=0$ for x.', 150, '600 − 4x = 0 ⇒ 4x = 600.', 'Interior critical number.'),
    num('5', 'optimization', 'Maximum area (m²)?', 45000, 'L = 600 − 2·150 = 300, so area = 150 · 300.', 'A(150).'),
    choice('6', 'secondTest', 'Why is this a MAX (not a min)?', ['$A\'\'=-4<0$', '$A\'\'=4>0$', 'because A′=0'], '$A\'\'=-4<0$', 'A′ = 0 just says flat; flat could be a valley. The graph of A is an upside-down parabola (cap-shaped), so the flat spot is the top.', 'Second Derivative Test: A″ < 0 ⇒ local max; with endpoints A(0)=A(300)=0 it is the absolute max.'),
  ] },
  { id: 'L3', title: 'Box: hold 32 cm³ with least material', steps: [
    choice('1', 'optimization', 'Square base x by x, height h, volume 32. Then h = ?', ['$32/x^2$', '$32/x$', '$32-x^2$'], '$32/x^2$', 'Volume = base area × height = x²·h. Solve for h.', 'Constraint x²h = 32.'),
    choice('2', 'optimization', 'Open top: material = bottom + 4 walls. $S(x)$ = ?', ['$x^2+128/x$', '$x^2+32/x$', '$2x^2+128/x$'], '$x^2+128/x$', 'Bottom is x². Each wall is x·h = x·32/x² = 32/x, and there are 4 of them. No lid!', 'S = x² + 4xh.'),
    choice('3', 'derivative', "$S'(x)$ = ?", ['$2x-128/x^2$', '$2x+128/x^2$', '$2x-128/x$'], '$2x-128/x^2$', '128/x = 128x⁻¹, whose derivative is −128x⁻².', 'Power rule with negative exponent.'),
    num('4', 'optimization', 'Solve $S\'(x)=0$: base side x = ?', 4, '2x = 128/x² ⇒ x³ = 64.', 'Critical number x = ∛64.'),
    num('5', 'optimization', 'Height at the optimum?', 2, 'h = 32/x² with x = 4.', 'h* = 32/16.'),
    choice('6', 'domain', 'Which domain applies?', ['$x>0$', '$0\\le x\\le 32$', 'all real x'], '$x>0$', 'A side length can\'t be zero or negative, and any positive x gives a valid height.', 'Physical constraints: x > 0, h > 0.'),
  ] },
  { id: 'L4', title: 'Motion: h(t) = 3 sin(πt/2) + 5 on [0, 1.5]', steps: [
    num('1', 'motion', 'What is the period (s)?', 4, 'One cycle is when πt/2 grows by 2π.', 'Period = 2π/B with B = π/2.'),
    num('2', 'motion', 'Maximum possible height?', 8, 'sin is at most 1: 3·1 + 5.', 'D + |A|.'),
    num('3', 'motion', 'First critical time t > 0 (v = 0)?', 1, 'v = (3π/2)cos(πt/2) is zero when πt/2 = π/2.', 'Critical times of h.'),
    choice('4', 'motion', 'At t = 1.5 is the object moving up or down?', ['up', 'down', 'stopped'], 'down', 'After the top at t = 1 it must come back down. Check: cos(3π/4) < 0.', 'Sign of v(1.5).'),
    num('5', 'motion', 'On [0, 1.5], what is the MINIMUM height?', 5, 'Candidates: endpoints t = 0 and t = 1.5, and the critical time t = 1. Compare h(0)=5, h(1)=8, h(1.5)≈7.12.', 'Closed Interval Method: the min occurs at the endpoint t = 0.'),
  ] },
];

function Guided() {
  const [li, setLi] = useState(0);
  const [k, setK] = useState(0);
  const L = LESSONS[li];
  const prog = useProgress();
  const fb = L.expr ? buildFunction(L.expr) : null;
  return (
    <Card title="Guided Mode — one microstep at a time">
      <div className="tabs">{LESSONS.map((l, i) => <button key={l.id} className={i === li ? 'active' : ''} onClick={() => { setLi(i); setK(k + 1); }}>{prog.lessons[l.id]?.done ? '✔ ' : ''}{l.title}</button>)}</div>
      {fb && L.dom && <Graph x={L.dom} y={autoY([fb.f], L.dom)} height={200} curves={[{ fn: fb.f, color: COLORS.f }]} title={<TeX>{`f(x)=${fb.tex}`}</TeX>} />}
      <StepRunner key={L.id + k} steps={L.steps} lessonId={L.id} />
      <button onClick={() => setK(k + 1)}>↺ Restart lesson</button>
    </Card>
  );
}

const PRED = [
  { expr: 'x^3 - 3*x', dom: [-2.5, 2.5] as [number, number] }, { expr: 'sin(x)', dom: [-6.3, 6.3] as [number, number] },
  { expr: 'x^4 - 2*x^2', dom: [-1.8, 1.8] as [number, number] }, { expr: 'x*exp(-x)', dom: [-0.5, 5] as [number, number] },
  { expr: '1/(1+x^2)', dom: [-4, 4] as [number, number] },
];
function Prediction() {
  const [i, setI] = useState(0);
  const P = PRED[i % PRED.length];
  const fb = buildFunction(P.expr);
  const [strokes, setStrokes] = useState<[number, number][][]>([]);
  const [revealT, setRevealT] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [slopeGuess, setSlopeGuess] = useState('');
  const [slopeRes, setSlopeRes] = useState<string | null>(null);
  const x0 = useMemo(() => P.dom[0] + (P.dom[1] - P.dom[0]) * (0.25 + 0.5 * ((i * 0.37) % 1)), [i, P]);
  const yd = autoY([fb.d1], P.dom);
  useEffect(() => {
    if (revealT === null || revealT >= P.dom[1]) return;
    const id = requestAnimationFrame(() => setRevealT((t) => (t === null ? null : t + (P.dom[1] - P.dom[0]) / 90)));
    return () => cancelAnimationFrame(id);
  }, [revealT, P]);
  const reveal = () => {
    const { fn, covered } = strokeToFn(strokes.flat(), P.dom[0], P.dom[1]);
    let ok = 0, n = 0;
    for (let k = 0; k <= 200; k++) { const x = P.dom[0] + ((P.dom[1] - P.dom[0]) * k) / 200; const u = fn(x), t = fb.d1(x); if (!Number.isFinite(u) || !Number.isFinite(t)) continue; n++; if (Math.sign(u) === Math.sign(t) || Math.abs(t) < (yd[1] - yd[0]) * 0.03) ok++; }
    const s = Math.round((n ? ok / n : 0) * Math.min(1, covered / 0.8) * 100);
    setScore(s); setRevealT(P.dom[0]);
    progress.update((p) => { p.predictions.made++; if (s >= 75) p.predictions.close++; return p; });
    progress.record('derivative', s >= 75, 'Predicted f′ had the wrong sign on some intervals.');
  };
  const next = () => { setI(i + 1); setStrokes([]); setRevealT(null); setScore(null); setSlopeGuess(''); setSlopeRes(null); };
  const trueSlope = fb.d1(x0);
  return (
    <Card title="Prediction Mode — commit first, then watch the reveal">
      <p><b>Challenge 1:</b> Here is f. The f′ graph is hidden. <b>Draw your prediction of f′</b> on the empty axes (where is it positive? zero? how big?), then reveal.</p>
      <Graph x={P.dom} y={autoY([fb.f], P.dom)} height={190} curves={[{ fn: fb.f, color: COLORS.f }]} title={<TeX>{`f(x)=${fb.tex}`}</TeX>}
        segments={slopeRes ? [{ x1: x0 - 1, y1: fb.f(x0) - trueSlope, x2: x0 + 1, y2: fb.f(x0) + trueSlope, color: COLORS.tan }] : []} points={[{ x: x0, y: fb.f(x0), color: COLORS.tan, r: 6, label: 'P' }]} />
      <Graph x={P.dom} y={yd} height={190} title={<span style={{ color: COLORS.d1 }}>Your f′ prediction (draw here)</span>}
        polylines={strokes.map((s) => ({ pts: s, color: '#facc15' }))} curves={revealT !== null ? [{ fn: fb.d1, color: COLORS.d1, clipTo: revealT, width: 3 }] : []}
        onDraw={revealT === null ? (pts, ph) => setStrokes((c) => (ph === 'start' ? [...c, pts] : [...c.slice(0, -1), pts])) : undefined} />
      <div className="row wrap">
        <button className="primary" onClick={reveal} disabled={!strokes.length || revealT !== null}>Reveal true f′ (animated)</button>
        <button onClick={() => setStrokes([])} disabled={revealT !== null}>Clear</button>
        {score !== null && <Badge kind={score >= 75 ? 'ok' : 'warn'}>sign agreement {score}%</Badge>}
      </div>
      {score !== null && score < 75 && <p className="feedback badf">Plain words: wherever f is going uphill, f′ must be above the axis; downhill ⇒ below; flat tops/bottoms ⇒ f′ crosses zero. Formally: sign of f′ ⇔ increasing/decreasing.</p>}
      <hr />
      <p><b>Challenge 2:</b> Predict the slope of the tangent line at point P (x = {fmt(x0, 2)}).</p>
      <form className="row wrap" onSubmit={(e) => { e.preventDefault(); const g = parseNum(slopeGuess); if (!Number.isFinite(g)) return; const err = Math.abs(g - trueSlope);
        const good = err < 0.25 * Math.max(1, Math.abs(trueSlope)); progress.record('derivative', good);
        setSlopeRes(`${good ? '🎯 Good estimate!' : 'Off a bit.'} True slope f′(${fmt(x0, 2)}) = ${fmt(trueSlope)} (exact, symbolic derivative). ${!good && Math.sign(g) !== Math.sign(trueSlope) ? 'Your sign was wrong: is the curve rising or falling at P?' : ''}`); }}>
        <input value={slopeGuess} onChange={(e) => setSlopeGuess(e.target.value)} placeholder="slope" style={{ width: '7em' }} disabled={!!slopeRes} />
        <button type="submit" disabled={!!slopeRes}>Lock in</button>
      </form>
      {slopeRes && <p className="feedback good">{slopeRes}</p>}
      <button onClick={next}>Next challenge →</button>
    </Card>
  );
}

function pickConcept(p: ReturnType<typeof progress.get>, r: () => number): { c: Concept; revisit: boolean } {
  const cs = Object.keys(CONCEPTS) as Concept[];
  const sorted = [...cs].sort((a, b) => weakness(p.concepts[a]) - weakness(p.concepts[b]));
  const weak = sorted.filter((c) => (p.concepts[c]?.attempts ?? 0) > 0 && weakness(p.concepts[c]) < 0.6);
  if (weak.length && r() < 0.6) return { c: weak[0], revisit: true };
  return { c: cs[Math.floor(r() * cs.length)], revisit: false };
}

function Mastery() {
  const prog = useProgress();
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [focus, setFocus] = useState<Concept | 'auto'>('auto');
  const { q, revisit, level } = useMemo(() => {
    const r = mulberry(seed);
    const pick = focus === 'auto' ? pickConcept(progress.get(), r) : { c: focus, revisit: false };
    const level = progress.get().concepts[pick.c]?.level ?? 1;
    return { q: { ...GENERATORS[pick.c](r, level), id: 'm' + seed }, revisit: pick.revisit, level };
  }, [seed, focus]);
  const [answered, setAnswered] = useState(false);
  useEffect(() => setAnswered(false), [seed]);
  return (
    <div className="grid2">
      <Card title="Mastery Mode — fresh problems, adaptive difficulty">
        <div className="row wrap">
          <label>Focus: <select value={focus} onChange={(e) => { setFocus(e.target.value as any); setSeed(seed + 1); }}>
            <option value="auto">Auto (targets weak concepts)</option>{(Object.keys(CONCEPTS) as Concept[]).map((c) => <option key={c} value={c}>{CONCEPTS[c]}</option>)}</select></label>
          <Badge>{CONCEPTS[q.concept!]}</Badge><Badge kind="warn">level {level}</Badge>{revisit && <Badge kind="bad">revisiting a weak concept</Badge>}
        </div>
        <QuestionBox key={q.id} q={q} onDone={() => setAnswered(true)} />
        <button className={answered ? 'primary' : ''} onClick={() => setSeed(seed + 1)}>{answered ? 'Next problem →' : 'Skip'}</button>
        <p className="note">Two correct first-tries in a row raise a concept's level; a miss lowers it and the concept is scheduled for revisiting.</p>
      </Card>
      <ProgressPanel prog={prog} />
    </div>
  );
}

function ProgressPanel({ prog }: { prog: ReturnType<typeof progress.get> }) {
  return (
    <Card title="Your progress (stored on this device)">
      {(Object.keys(CONCEPTS) as Concept[]).map((c) => { const s = prog.concepts[c]; const pct = s && s.attempts ? Math.round((s.correct / s.attempts) * 100) : 0; return (
        <div key={c} style={{ margin: '6px 0' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}><span>{CONCEPTS[c]}</span><small>{s ? `${s.correct}/${s.attempts} · level ${s.level}` : 'not started'}</small></div>
          <div className="bar"><div style={{ width: pct + '%' }} /></div>
          {s?.lastMistake && <small className="note">Last mistake hint: {s.lastMistake.slice(0, 110)}{s.lastMistake.length > 110 ? '…' : ''}</small>}
        </div>); })}
      <p>Predictions: {prog.predictions.close}/{prog.predictions.made} close · Lessons done: {Object.values(prog.lessons).filter((l) => l.done).length}/{LESSONS.length}</p>
      <button onClick={() => { if (confirm('Reset all progress on this device?')) progress.reset(); }}>Reset progress</button>
    </Card>
  );
}

export default function Learn() {
  const [mode, setMode] = useState<'explore' | 'guided' | 'predict' | 'mastery'>('guided');
  return (
    <div className="module">
      <Card title="7 · Guided Learning & Mastery">
        <div className="tabs">
          {(['explore', 'guided', 'predict', 'mastery'] as const).map((m) => <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>{{ explore: '🧪 Explore', guided: '🧭 Guided', predict: '🔮 Prediction', mastery: '🏆 Mastery' }[m]}</button>)}
        </div>
      </Card>
      {mode === 'explore' && <Card title="Explore Mode"><p>Every module (1–6) is an unrestricted sandbox: type any function in the Derivative Explorer, drag sliders in the Function Explorer, rotate boxes, scrub motion. Nothing is graded there.</p>
        <div className="row wrap">{[['deriv', '1 · Derivative Explorer'], ['sketch', '2 · Curve Sketching'], ['field', '3 · River Field'], ['box', '4 · 3D Box'], ['motion', '5 · Motion'], ['funcs', '6 · Function Explorer']].map(([id, n]) => <a key={id} href={'#' + id}><button>{n}</button></a>)}</div></Card>}
      {mode === 'guided' && <Guided />}
      {mode === 'predict' && <Prediction />}
      {mode === 'mastery' && <Mastery />}
    </div>
  );
}
