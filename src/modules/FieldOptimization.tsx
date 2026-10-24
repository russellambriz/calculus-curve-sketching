import { useRef, useState } from 'react';
import { Graph } from '../components/Graph';
import { TeX } from '../components/TeX';
import { Card, Slider, Badge } from '../components/ui';
import { field } from '../math/optimization';
import { fmt } from '../math/expr';
import { parseNum } from '../components/Question';
import { progress } from '../state/progress';
import { COLORS } from './shared';

export default function FieldOptimization() {
  const [P, setP] = useState(400);
  const [x, setX] = useState(60);
  const [guess, setGuess] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [guessRes, setGuessRes] = useState<string | null>(null);
  const L = field.length(P, x), A = field.area(P, x), dA = field.dArea(P, x);
  const xs = field.optimalX(P), Amax = field.maxArea(P);
  const setPx = (p: number) => { setP(p); setX((v) => Math.min(v, p / 2)); setRevealed(false); setGuessRes(null); };

  // scene geometry
  const W = 520, Hs = 300, scale = Math.min((W - 40) / P, (Hs - 70) / (P / 2));
  const fw = L * scale, fh = x * scale, ox = (W - fw) / 2, oy = 50;
  const drag = useRef(false);
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const py = ((e.clientY - r.top) / r.height) * Hs;
    setX(Math.max(0, Math.min(P / 2, (py - oy) / scale)));
  };
  const submitGuess = () => {
    const g = parseNum(guess); if (!Number.isFinite(g)) return;
    const err = Math.abs(g - xs) / xs;
    progress.update((p) => { p.predictions.made++; if (err < 0.1) p.predictions.close++; return p; });
    progress.record('optimization', err < 0.05);
    setGuessRes(err < 0.05 ? '🎯 Excellent prediction!' : err < 0.15 ? 'Close! Watch the reveal.' :
      g > xs ? 'Too wide: making the side walls long eats the fence you need for the long side.' : 'Too narrow: the field becomes a long thin strip with little area.');
    setRevealed(true); setX(g > 0 && g < P / 2 ? g : x);
    // animate to optimum
    const start = performance.now(), from = g > 0 && g < P / 2 ? g : x;
    const step = (t: number) => { const k = Math.min(1, (t - start) / 1500); setX(from + (xs - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    setTimeout(() => requestAnimationFrame(step), 600);
  };
  const keyX = (e: React.KeyboardEvent) => { const s = P / 200 * (e.shiftKey ? 10 : 1); if (e.key === 'ArrowUp') setX(Math.max(0, x - s)); if (e.key === 'ArrowDown') setX(Math.min(P / 2, x + s)); };

  return (
    <div className="module">
      <Card title="3 · Optimization: Rectangular Field by a River">
        <p>A farmer has <b>{fmt(P)} m</b> of fence. The river is one side, so fence is needed on only three sides: two sides of width <TeX>x</TeX> (perpendicular to the river) and one long side <TeX>L</TeX>.</p>
        <Slider label="Total fencing P" value={P} min={40} max={1200} step={10} onChange={setPx} unit=" m" />
      </Card>
      <div className="grid2">
        <div>
          <Card title="The field — drag the bottom edge (or focus it and press ↑/↓)">
            <svg viewBox={`0 0 ${W} ${Hs}`} style={{ width: '100%', touchAction: 'none', cursor: 'ns-resize' }} tabIndex={0} onKeyDown={keyX} role="slider" aria-label="field width x" aria-valuenow={x}
              onPointerDown={(e) => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); onMove(e); }} onPointerMove={onMove} onPointerUp={() => (drag.current = false)}>
              <rect x={0} y={0} width={W} height={oy - 4} fill="#1d4ed8" opacity={0.7} />
              <text x={10} y={28} fill="#bfdbfe" fontSize={16}>〰 River (no fence needed) 〰</text>
              <rect x={ox} y={oy} width={Math.max(0, fw)} height={Math.max(0, fh)} fill="#166534" opacity={0.65} />
              <polyline points={`${ox},${oy} ${ox},${oy + fh} ${ox + fw},${oy + fh} ${ox + fw},${oy}`} fill="none" stroke="#fbbf24" strokeWidth={4} strokeDasharray="10 4" />
              <text x={ox + fw / 2} y={oy + fh + 18} fill="#fde68a" fontSize={14} textAnchor="middle">L = {fmt(L, 1)} m</text>
              <text x={ox - 6} y={oy + fh / 2} fill="#fde68a" fontSize={14} textAnchor="end">x = {fmt(x, 1)}</text>
              <text x={ox + fw / 2} y={oy + fh / 2 + 5} fill="#dcfce7" fontSize={15} textAnchor="middle">A = {fmt(A, 0)} m²</text>
              <circle cx={ox + fw / 2} cy={oy + fh} r={10} fill="#facc15" />
            </svg>
            <Slider label="Width x (perpendicular to river)" value={x} min={0} max={P / 2} step={P / 400} onChange={setX} unit=" m" />
            <div className="kv"><span>Constraint</span><TeX>{`2x+L=${fmt(P)}\\;\\Rightarrow\\;L=${fmt(P)}-2x=${fmt(L, 2)}`}</TeX>
              <span>Check</span><TeX>{`2(${fmt(x, 2)})+${fmt(L, 2)}=${fmt(2 * x + L, 2)}`}</TeX>
              <span>Area</span><TeX>{`A(x)=x(${fmt(P)}-2x)=${fmt(P)}x-2x^2=${fmt(A, 1)}`}</TeX>
              <span>Derivative</span><TeX>{`A'(x)=${fmt(P)}-4x=${fmt(dA, 2)}`}</TeX></div>
            <p>{dA > 0.5 ? <Badge kind="ok">A′ &gt; 0: widening still adds area</Badge> : dA < -0.5 ? <Badge kind="bad">A′ &lt; 0: widening now loses area</Badge> : <Badge kind="info">A′ ≈ 0: the top of the hill</Badge>}</p>
          </Card>
        </div>
        <div>
          <Card title="Prediction challenge">
            {!revealed ? (
              <form className="row wrap" onSubmit={(e) => { e.preventDefault(); submitGuess(); }}>
                <span>Before calculus: which width x gives the biggest area?</span>
                <input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="x in m" style={{ width: '7em' }} />
                <button className="primary" type="submit">Lock in & reveal</button>
              </form>
            ) : (
              <div>
                {guessRes && <p>{guessRes}</p>}
                <TeX block>{`A'(x)=0 \\Rightarrow ${fmt(P)}-4x=0 \\Rightarrow x^*=\\tfrac{P}{4}=${fmt(xs, 2)},\\; L^*=\\tfrac{P}{2}=${fmt(P / 2, 2)},\\; A_{max}=\\tfrac{P^2}{8}=${fmt(Amax, 1)}`}</TeX>
                <p>A″(x) = −4 &lt; 0 (always concave down) and the endpoints x=0, x=P/2 give A=0, so this critical point is the absolute max on <TeX>{`[0, ${fmt(P / 2)}]`}</TeX>.</p>
                <button onClick={() => { setRevealed(false); setGuess(''); setGuessRes(null); }}>Try another prediction</button>
              </div>
            )}
          </Card>
          <Graph x={[0, P / 2]} y={[-Amax * 0.08, Amax * 1.15]} height={210} title={<span style={{ color: COLORS.f }}>Area A(x)</span>}
            curves={[{ fn: (t) => field.area(P, t), color: COLORS.f }]}
            segments={[{ x1: x - P / 8, y1: A - dA * P / 8, x2: x + P / 8, y2: A + dA * P / 8, color: COLORS.tan }]}
            points={[{ x, y: A, color: COLORS.tan, r: 7 }, ...(revealed ? [{ x: xs, y: Amax, color: COLORS.max, r: 6, label: 'max' }] : [])]}
            vlines={[{ x, color: '#facc15' }]} onDragX={setX} dragX={x} step={P / 400} ariaLabel="area graph" />
          <Graph x={[0, P / 2]} y={[-P * 1.1, P * 1.1]} height={160} title={<span style={{ color: COLORS.d1 }}>A′(x) = P − 4x</span>}
            curves={[{ fn: (t) => field.dArea(P, t), color: COLORS.d1 }]}
            points={[{ x, y: dA, color: COLORS.tan }, ...(revealed ? [{ x: xs, y: 0, color: COLORS.max, label: 'A′=0' }] : [])]}
            vlines={[{ x, color: '#facc15' }]} onDragX={setX} dragX={x} step={P / 400} ariaLabel="derivative graph" />
          <Card title="Why is A′ = 0 at the best field?">
            <p>Plain words: while A′ is positive, making the field a bit wider still <i>adds</i> area, so you're not done. Once A′ is negative, widening <i>loses</i> area, so you went too far. The best width is exactly where it switches — the instant where a tiny change neither helps nor hurts: A′ = 0.</p>
            <p>Formally: if an interior point c gives a maximum and A is differentiable there, then A′(c) = 0 (Fermat's theorem). The domain <TeX>{`0\\le x\\le P/2`}</TeX> comes from physics: lengths can't be negative (x ≥ 0 and L = P − 2x ≥ 0). Always compare endpoint values too (here both give A = 0).</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
