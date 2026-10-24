import { useState } from 'react';
import { Graph, autoY } from '../components/Graph';
import { TeX } from '../components/TeX';
import { Card, Slider } from '../components/ui';
import { fmt } from '../math/expr';
import { useAnalysis, COLORS, featurePoints, AnalysisSummary, NumericNote, monoBands } from './shared';

type P = Record<string, number>;
interface Family { id: string; name: string; params: { k: string; min: number; max: number; def: number }[]; expr: (p: P) => string; x: [number, number]; notes: (p: P) => string[] }
const n = (v: number) => `(${+v.toFixed(4)})`;
export const FAMILIES: Family[] = [
  { id: 'quad', name: 'Quadratic a x² + b x + c', params: [{ k: 'a', min: -3, max: 3, def: 1 }, { k: 'b', min: -5, max: 5, def: -2 }, { k: 'c', min: -5, max: 5, def: -1 }], x: [-5, 5],
    expr: (p) => `${n(p.a)}*x^2 + ${n(p.b)}*x + ${n(p.c)}`,
    notes: (p) => ['Domain: all real numbers.', p.a === 0 ? 'a = 0: it is a line, no turning point.' : `One turning point (vertex) at x = −b/(2a) = ${fmt(-p.b / (2 * p.a))}. f″ = 2a is constant: always ${p.a > 0 ? 'concave up' : 'concave down'}, so no inflection points.`] },
  { id: 'cubic', name: 'Cubic a x³ + b x² + c x + d', params: [{ k: 'a', min: -2, max: 2, def: 1 }, { k: 'b', min: -4, max: 4, def: 0 }, { k: 'c', min: -6, max: 6, def: -3 }, { k: 'd', min: -4, max: 4, def: 0 }], x: [-3.5, 3.5],
    expr: (p) => `${n(p.a)}*x^3 + ${n(p.b)}*x^2 + ${n(p.c)}*x + ${n(p.d)}`,
    notes: (p) => { const disc = 4 * p.b * p.b - 12 * p.a * p.c; return ['Domain: all reals.', `f′ = 3a x² + 2b x + c has discriminant ${fmt(disc)}: ${disc > 0 ? 'two turning points' : disc === 0 ? 'a single flat point (no extremum)' : 'no turning points — f is monotonic'}.`, p.a !== 0 ? `Always exactly one inflection at x = −b/(3a) = ${fmt(-p.b / (3 * p.a))}.` : '']; } },
  { id: 'quart', name: 'Quartic a x⁴ + b x³ + c x² + d x + e', params: [{ k: 'a', min: -2, max: 2, def: 1 }, { k: 'b', min: -3, max: 3, def: 0 }, { k: 'c', min: -6, max: 6, def: -4 }, { k: 'd', min: -4, max: 4, def: 1 }, { k: 'e', min: -4, max: 4, def: 0 }], x: [-3, 3],
    expr: (p) => `${n(p.a)}*x^4 + ${n(p.b)}*x^3 + ${n(p.c)}*x^2 + ${n(p.d)}*x + ${n(p.e)}`,
    notes: () => ['Domain: all reals.', 'Up to 3 turning points and 2 inflections. Set c = d = b = 0 to get a·x⁴: f″(0) = 0 yet no inflection.'] },
  { id: 'rat', name: 'Rational (a x + b)/(x − c) + d', params: [{ k: 'a', min: -3, max: 3, def: 1 }, { k: 'b', min: -4, max: 4, def: 2 }, { k: 'c', min: -3, max: 3, def: 1 }, { k: 'd', min: -3, max: 3, def: 0 }], x: [-6, 6],
    expr: (p) => `(${n(p.a)}*x + ${n(p.b)})/(x - ${n(p.c)}) + ${n(p.d)}`,
    notes: (p) => { const num = p.a * p.c + p.b; return [`Domain: x ≠ ${fmt(p.c)} (denominator zero).`, Math.abs(num) < 1e-9 ? `Numerator is also 0 at x = ${fmt(p.c)}: a removable HOLE, not an asymptote (f is constant ${fmt(p.a + p.d)} elsewhere).` : `Vertical asymptote x = ${fmt(p.c)}.`, `Horizontal asymptote y = a + d = ${fmt(p.a + p.d)}.`, `f′ = −(ac + b)/(x − c)² never equals 0 ⇒ no turning points; f is ${num > 0 ? 'decreasing' : 'increasing'} on each piece.`]; } },
  { id: 'exp', name: 'Exponential a·e^(b x) + c', params: [{ k: 'a', min: -3, max: 3, def: 1 }, { k: 'b', min: -2, max: 2, def: 0.7 }, { k: 'c', min: -3, max: 3, def: 0 }], x: [-4, 4],
    expr: (p) => `${n(p.a)}*exp(${n(p.b)}*x) + ${n(p.c)}`,
    notes: (p) => ['Domain: all reals.', `Horizontal asymptote y = ${fmt(p.c)} as x → ${p.b > 0 ? '−∞' : '+∞'}.`, `f′ = ab·e^(bx) never 0 ⇒ no turning points; f″ = ab²e^(bx) has constant sign ⇒ no inflection.`] },
  { id: 'log', name: 'Logarithmic a·ln(b(x − c)) + d', params: [{ k: 'a', min: -3, max: 3, def: 1 }, { k: 'b', min: 0.2, max: 3, def: 1 }, { k: 'c', min: -3, max: 3, def: -1 }, { k: 'd', min: -3, max: 3, def: 0 }], x: [-4, 6],
    expr: (p) => `${n(p.a)}*log(${n(p.b)}*(x - ${n(p.c)})) + ${n(p.d)}`,
    notes: (p) => [`Domain: b(x − c) > 0 ⇒ x > ${fmt(p.c)}. The graph doesn't exist to the left.`, `Vertical asymptote x = ${fmt(p.c)}.`, `f′ = a/(x − c): never 0 ⇒ no turning points. f″ = −a/(x − c)² ⇒ always ${p.a > 0 ? 'concave down' : 'concave up'}.`] },
  { id: 'sin', name: 'Sine a·sin(b x + c) + d', params: [{ k: 'a', min: -3, max: 3, def: 1.5 }, { k: 'b', min: 0.2, max: 4, def: 1 }, { k: 'c', min: -3.2, max: 3.2, def: 0 }, { k: 'd', min: -3, max: 3, def: 0 }], x: [-7, 7],
    expr: (p) => `${n(p.a)}*sin(${n(p.b)}*x + ${n(p.c)}) + ${n(p.d)}`,
    notes: (p) => ['Domain: all reals; no asymptotes.', `Period 2π/b = ${fmt((2 * Math.PI) / p.b)}; turning points every half-period; inflections where the graph crosses its midline y = ${fmt(p.d)}.`] },
  { id: 'cos', name: 'Cosine a·cos(b x + c) + d', params: [{ k: 'a', min: -3, max: 3, def: 1.5 }, { k: 'b', min: 0.2, max: 4, def: 1 }, { k: 'c', min: -3.2, max: 3.2, def: 0 }, { k: 'd', min: -3, max: 3, def: 0 }], x: [-7, 7],
    expr: (p) => `${n(p.a)}*cos(${n(p.b)}*x + ${n(p.c)}) + ${n(p.d)}`,
    notes: (p) => ['Domain: all reals.', `Period ${fmt((2 * Math.PI) / p.b)}. Note (cos)′ = −sin: the derivative graph is the original shifted by a quarter period.`] },
  { id: 'gauss', name: 'Composite: a·e^(−b(x−c)²)', params: [{ k: 'a', min: -3, max: 3, def: 2 }, { k: 'b', min: 0.1, max: 3, def: 1 }, { k: 'c', min: -3, max: 3, def: 0 }], x: [-5, 5],
    expr: (p) => `${n(p.a)}*exp(-${n(p.b)}*(x - ${n(p.c)})^2)`,
    notes: (p) => ['Outer e^u, inner u = −b(x−c)²: chain rule f′ = a·e^u·(−2b(x−c)).', `One turning point at x = ${fmt(p.c)}; inflections at x = c ± 1/√(2b) = ${fmt(p.c - 1 / Math.sqrt(2 * p.b))}, ${fmt(p.c + 1 / Math.sqrt(2 * p.b))}.`, 'Horizontal asymptote y = 0.'] },
  { id: 'sinsq', name: 'Composite: sin(a x²)', params: [{ k: 'a', min: 0.1, max: 2, def: 0.5 }], x: [-4, 4],
    expr: (p) => `sin(${n(p.a)}*x^2)`,
    notes: () => ['Chain rule: f′ = cos(a x²)·2a x. Turning points get closer together as |x| grows because the inner function speeds up.'] },
  { id: 'sqrt', name: 'Composite: √(a x² + b)', params: [{ k: 'a', min: -2, max: 2, def: -1 }, { k: 'b', min: -2, max: 9, def: 4 }], x: [-4, 4],
    expr: (p) => `sqrt(${n(p.a)}*x^2 + ${n(p.b)})`,
    notes: () => ['Domain: a x² + b ≥ 0 (otherwise undefined).', 'f′ = a x/√(a x² + b) is undefined where the inside is 0 — vertical tangents at the domain edges (those are endpoints, not interior critical numbers).'] },
];

export default function FunctionExplorer() {
  const [fi, setFi] = useState(0);
  const fam = FAMILIES[fi];
  const [params, setParams] = useState<Record<string, P>>({});
  const p: P = params[fam.id] ?? Object.fromEntries(fam.params.map((q) => [q.k, q.def]));
  const expr = fam.expr(p);
  const { fb, an } = useAnalysis(expr, fam.x[0], fam.x[1]);
  const [x, setX] = useState(1);
  const yf = autoY([fb.f], fam.x);
  return (
    <div className="module">
      <Card title="6 · Function Explorer">
        <div className="tabs">{FAMILIES.map((f, i) => <button key={f.id} className={i === fi ? 'active' : ''} onClick={() => setFi(i)}>{f.name.split(' ')[0]}{f.name.startsWith('Composite') ? ' ' + f.name.split(':')[1].trim().slice(0, 10) : ''}</button>)}</div>
        <b>{fam.name}</b>
        <div className="grid3">{fam.params.map((q) => <Slider key={q.k} label={q.k} value={p[q.k]} min={q.min} max={q.max} step={(q.max - q.min) / 100} onChange={(v) => setParams({ ...params, [fam.id]: { ...p, [q.k]: v } })} />)}</div>
        <div className="eqs"><TeX>{`f(x)=${fb.tex}`}</TeX></div>
        <div className="eqs"><TeX>{`f'(x)=${fb.d1Tex}`}</TeX></div>
        <div className="eqs"><TeX>{`f''(x)=${fb.d2Tex}`}</TeX></div>
      </Card>
      <div className="grid2">
        <div>
          <Graph x={fam.x} y={yf} height={260} title={<span style={{ color: COLORS.f }}>f(x)</span>} curves={[{ fn: fb.f, color: COLORS.f, width: 2.6 }]} bands={monoBands(an)}
            points={[...featurePoints(an, 'f', fb), { x, y: fb.f(x), color: COLORS.tan, r: 6 }]}
            segments={Number.isFinite(fb.d1(x)) ? [{ x1: x - 2, y1: fb.f(x) - 2 * fb.d1(x), x2: x + 2, y2: fb.f(x) + 2 * fb.d1(x), color: COLORS.tan }] : []}
            vlines={[{ x, color: '#facc15' }, ...(an?.discontinuities ?? []).map((d) => ({ x: d.x, color: '#f87171', dash: '3 3' }))]} onDragX={setX} dragX={x} />
          <Graph x={fam.x} y={autoY([fb.d1], fam.x)} height={160} title={<span style={{ color: COLORS.d1 }}>f′(x)</span>} curves={[{ fn: fb.d1, color: COLORS.d1 }]} vlines={[{ x, color: '#facc15' }]} points={[{ x, y: fb.d1(x), color: COLORS.tan }]} onDragX={setX} dragX={x} />
          <Graph x={fam.x} y={autoY([fb.d2], fam.x)} height={160} title={<span style={{ color: COLORS.d2 }}>f″(x)</span>} curves={[{ fn: fb.d2, color: COLORS.d2 }]} vlines={[{ x, color: '#facc15' }]} points={[{ x, y: fb.d2(x), color: COLORS.tan }]} onDragX={setX} dragX={x} />
        </div>
        <div>
          <Card title="Live values"><TeX block>{`x=${fmt(x)},\\; f=${fmt(fb.f(x))},\\; f'=${fmt(fb.d1(x))},\\; f''=${fmt(fb.d2(x))}`}</TeX></Card>
          <Card title="Domain, asymptotes, turning points, inflection"><ul className="facts">{fam.notes(p).filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}</ul></Card>
          {an && <Card title={`Detected on [${fam.x[0]}, ${fam.x[1]}]`}><AnalysisSummary an={an} /><NumericNote symbolic={fb.symbolic} /></Card>}
        </div>
      </div>
    </div>
  );
}
