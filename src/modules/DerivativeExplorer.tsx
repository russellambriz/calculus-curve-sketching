import { useEffect, useRef, useState } from 'react';
import { Graph, autoY } from '../components/Graph';
import { TeX } from '../components/TeX';
import { Card, Slider, SignChart, Badge, intervalText } from '../components/ui';
import { fmt } from '../math/expr';
import { useAnalysis, COLORS, featurePoints, monoBands, concBands, AnalysisSummary, NumericNote } from './shared';

export const PRESETS: { expr: string; a: number; b: number; name: string; note?: string }[] = [
  { name: 'Cubic with max & min', expr: 'x^3 - 3*x', a: -2.5, b: 2.5 },
  { name: "x³ — f'=0, no extremum", expr: 'x^3', a: -2, b: 2, note: "f′(0)=0 but f′ is positive on BOTH sides, so the graph keeps rising: a flat spot, not a peak or valley. f′=0 is necessary for a smooth extremum, not sufficient." },
  { name: "x⁴ — f''=0, no inflection", expr: 'x^4', a: -1.6, b: 1.6, note: "f″(0)=0 but f″ ≥ 0 on both sides, so the graph is concave up everywhere. An inflection needs the concavity to CHANGE, not just f″=0. (Also: 2nd-derivative test is inconclusive here; the 1st-derivative test shows a min.)" },
  { name: '|x| — corner, f′ undefined', expr: 'abs(x)', a: -2, b: 2, note: 'The slope jumps from −1 to +1 at 0. No tangent line exists, f′(0) is undefined, yet x=0 is a critical number and a minimum.' },
  { name: 'x^(2/3) — cusp', expr: 'x^(2/3)', a: -2, b: 2, note: 'f′(x) = (2/3)x^(−1/3) blows up at 0 (vertical tangent from both sides, opposite directions): a cusp. Critical number with f′ undefined; local min.' },
  { name: 'Quartic', expr: 'x^4 - 4*x^2 + x', a: -2.3, b: 2.3 },
  { name: 'Rational (asymptote)', expr: '(x^2+1)/x', a: -4, b: 4 },
  { name: 'Gaussian bell', expr: 'exp(-x^2)', a: -3, b: 3 },
  { name: 'Sine wave', expr: 'sin(x)', a: -6.3, b: 6.3 },
  { name: 'x·e^(−x)', expr: 'x*exp(-x)', a: -1, b: 5 },
];

export default function DerivativeExplorer() {
  const [pi, setPi] = useState(0);
  const [expr, setExpr] = useState(PRESETS[0].expr);
  const [draft, setDraft] = useState(PRESETS[0].expr);
  const [dom, setDom] = useState<[number, number]>([PRESETS[0].a, PRESETS[0].b]);
  const [x, setX] = useState(-1.7);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const { fb, an } = useAnalysis(expr, dom[0], dom[1]);
  const raf = useRef<number>();
  const dir = useRef(1);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000; last = t;
      setX((v) => { let n = v + dir.current * speed * dt * (dom[1] - dom[0]) / 4;
        if (n > dom[1]) { n = dom[1]; dir.current = -1; } if (n < dom[0]) { n = dom[0]; dir.current = 1; } return n; });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [playing, speed, dom]);

  const choose = (i: number) => { const p = PRESETS[i]; setPi(i); setExpr(p.expr); setDraft(p.expr); setDom([p.a, p.b]); setX(p.a + (p.b - p.a) * 0.15); };
  const fy = autoY([fb.f], dom), d1y = autoY([fb.d1], dom), d2y = autoY([fb.d2], dom);
  const y = fb.f(x), m = fb.d1(x), k = fb.d2(x);
  const span = dom[1] - dom[0];
  const tan = Number.isFinite(m) && Number.isFinite(y) ? [{ x1: x - span, y1: y - m * span, x2: x + span, y2: y + m * span, color: COLORS.tan, width: 2 }] : [];
  const vl = [{ x, color: '#facc15' }];
  const preset = PRESETS[pi];

  return (
    <div className="module">
      <Card title="1 · Derivative Explorer">
        <div className="row wrap">
          <select value={pi} onChange={(e) => choose(+e.target.value)} aria-label="preset function">
            {PRESETS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
          </select>
          <form className="row" onSubmit={(e) => { e.preventDefault(); setExpr(draft.trim()); }}>
            <label>f(x) = <input value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="custom function" style={{ width: '11em' }} /></label>
            <button type="submit">Graph</button>
          </form>
          <label>x from <input type="number" value={dom[0]} step="0.5" onChange={(e) => setDom([+e.target.value, dom[1]])} style={{ width: '4.5em' }} /></label>
          <label>to <input type="number" value={dom[1]} step="0.5" onChange={(e) => setDom([dom[0], +e.target.value])} style={{ width: '4.5em' }} /></label>
        </div>
        {fb.error && <p className="err">Couldn't read that function: {fb.error}. Use x, + − * / ^, sin, cos, tan, exp, log, sqrt, abs, cbrt.</p>}
        {preset.note && expr === preset.expr && <p className="callout">💡 {preset.note}</p>}
        <div className="eqs">
          <TeX>{`f(x)=${fb.tex}`}</TeX> <TeX>{`f'(x)=${fb.d1Tex}`}</TeX> <TeX>{`f''(x)=${fb.d2Tex}`}</TeX>
        </div>
      </Card>

      <div className="grid2">
        <div>
          <Graph x={dom} y={fy} height={260} title={<span style={{ color: COLORS.f }}>f(x) — drag anywhere (or focus + ←/→)</span>}
            curves={[{ fn: fb.f, color: COLORS.f, width: 2.6 }]} segments={tan} bands={monoBands(an)}
            points={[...featurePoints(an, 'f', fb), { x, y, color: COLORS.tan, r: 7 }]} vlines={vl}
            onDragX={setX} dragX={x} ariaLabel="Drag point along f" />
          <Graph x={dom} y={d1y} height={180} title={<span style={{ color: COLORS.d1 }}>f′(x) — height here = slope of f</span>}
            curves={[{ fn: fb.d1, color: COLORS.d1 }]} bands={monoBands(an)} vlines={vl}
            points={[...featurePoints(an, 'd1', fb), { x, y: m, color: COLORS.tan, r: 6 }]} onDragX={setX} dragX={x} ariaLabel="f prime" />
          <Graph x={dom} y={d2y} height={180} title={<span style={{ color: COLORS.d2 }}>f″(x) — height here = bending of f</span>}
            curves={[{ fn: fb.d2, color: COLORS.d2 }]} bands={concBands(an)} vlines={vl}
            points={[{ x, y: k, color: COLORS.tan, r: 6 }]} onDragX={setX} dragX={x} ariaLabel="f double prime" />
        </div>
        <div>
          <Card title="Live readout">
            <div className="row wrap">
              <button onClick={() => setPlaying(!playing)}>{playing ? '⏸ Pause' : '▶ Animate along curve'}</button>
              <Slider label="speed" value={speed} min={0.05} max={2} onChange={setSpeed} />
            </div>
            <Slider label="x" value={x} min={dom[0]} max={dom[1]} step={span / 1000} onChange={setX} />
            <TeX block>{`x=${fmt(x)},\\quad f(x)=${fmt(y)}`}</TeX>
            <TeX block>{`\\text{slope }f'(${fmt(x, 2)})=${fmt(m)}${fb.symbolic ? '' : '\\ (\\text{numeric})'}`}</TeX>
            <TeX block>{Number.isFinite(m) ? `\\text{tangent: } y=${fmt(y)}${m >= 0 ? '+' : '-'}${fmt(Math.abs(m))}(x${x < 0 ? '+' : '-'}${fmt(Math.abs(x))})` : '\\text{no tangent line: } f\'\\text{ undefined here}'}</TeX>
            <TeX block>{`f''(${fmt(x, 2)})=${fmt(k)}`}</TeX>
            <p>
              Right here f is <Badge kind={m > 0 ? 'ok' : m < 0 ? 'bad' : 'info'}>{m > 0 ? 'increasing ↗' : m < 0 ? 'decreasing ↘' : Number.isFinite(m) ? 'flat (f′=0)' : 'f′ undefined'}</Badge>{' '}
              and <Badge kind={k > 0 ? 'info' : k < 0 ? 'warn' : 'info'}>{k > 0 ? 'concave up ∪' : k < 0 ? 'concave down ∩' : Number.isFinite(k) ? 'f″=0 (check sign change!)' : 'f″ undefined'}</Badge>
            </p>
          </Card>
          {an && <Card title="Sign charts (live)">
            <SignChart label={<TeX>{"f'"}</TeX>} intervals={an.monotonic} posText="f ↗" negText="f ↘" marks={[...an.criticals.map((c) => ({ x: c.x })), ...an.discontinuities.map((d) => ({ x: d.x, text: 'VA' }))]} />
            <SignChart label={<TeX>{"f''"}</TeX>} intervals={an.concavity} posText="∪" negText="∩" marks={an.inflections.map((c) => ({ x: c.x }))} />
            <p><b>Increasing:</b> {intervalText(an.monotonic, 1)}<br /><b>Decreasing:</b> {intervalText(an.monotonic, -1)}</p>
            <p><b>Concave up:</b> {intervalText(an.concavity, 1)}<br /><b>Concave down:</b> {intervalText(an.concavity, -1)}</p>
            <AnalysisSummary an={an} />
            <NumericNote symbolic={fb.symbolic} />
          </Card>}
          <Card title="Why two derivatives?">
            <p><b>f′ answers “which way?”</b> Picture walking left→right on the curve. f′ is how steep your path is: positive = uphill, negative = downhill. Where f′ changes sign, you've topped a hill (+ → −) or bottomed a valley (− → +).</p>
            <p><b>f″ answers “how is it bending?”</b> It's the slope <i>of the slope</i>. Positive f″ means the slope is getting bigger — the curve bends like a cup ∪ (concave up). Negative f″ bends like a cap ∩. Where f″ changes sign the bending flips: an <i>inflection point</i>.</p>
            <p>They're independent: a curve can be going <i>up</i> while bending <i>down</i> (e.g. √x). Try dragging and watch the two badges disagree.</p>
            <p className="note">Shading: green/red = f increasing/decreasing (on f and f′); blue/yellow = concave up/down (on f″). Hollow markers = candidate that is <i>not</i> an extremum / inflection.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
