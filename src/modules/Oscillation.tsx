import { useEffect, useRef, useState } from 'react';
import { Graph } from '../components/Graph';
import { TeX } from '../components/TeX';
import { Card, Slider, Badge } from '../components/ui';
import { osc, type Osc } from '../math/optimization';
import { fmt } from '../math/expr';
import { COLORS } from './shared';

export default function Oscillation() {
  const [o, setO] = useState<Osc>({ A: 2, B: Math.PI / 2, C: 0, D: 5 });
  const [t, setT] = useState(0);
  const [T, setTmax] = useState(8);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [iv, setIv] = useState<[number, number]>([0.5, 2.5]);
  const set = (k: keyof Osc) => (v: number) => setO({ ...o, [k]: v });
  const raf = useRef<number>();
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const f = (now: number) => { const dt = (now - last) / 1000; last = now; setT((v) => (v + dt * rate) % T); raf.current = requestAnimationFrame(f); };
    raf.current = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf.current!);
  }, [playing, rate, T]);
  const h = osc.h(o, t), v = osc.v(o, t), a = osc.a(o, t), per = osc.period(o);
  const crit = osc.criticalTimes(o, 0, T);
  const ext = osc.extremaOn(o, Math.min(iv[0], iv[1]), Math.max(iv[0], iv[1]));
  const hMax = o.D + Math.abs(o.A), hMin = o.D - Math.abs(o.A);
  const yH: [number, number] = [Math.min(0, hMin - 1), hMax + 1];
  const vm = Math.abs(o.A * o.B) * 1.2 + 0.5, am = Math.abs(o.A * o.B * o.B) * 1.2 + 0.5;
  const tl = [{ x: t, color: '#facc15', dash: '0' }];
  const band = [{ a: Math.min(...iv), b: Math.max(...iv), color: 'rgba(192,132,252,0.12)' }];
  const critPts = (g: (t: number) => number) => crit.map((c) => ({ x: c, y: g(c), color: osc.h(o, c) > o.D ? COLORS.max : COLORS.min, r: 4 }));
  const sceneH = 260, sy = (y: number) => sceneH - 10 - ((y - yH[0]) / (yH[1] - yH[0])) * (sceneH - 20);

  return (
    <div className="module">
      <Card title="5 · Oscillating Motion">
        <TeX block>{`h(t)=A\\sin\\big(B(t-C)\\big)+D = ${fmt(o.A)}\\sin\\big(${fmt(o.B)}(t-${fmt(o.C)})\\big)+${fmt(o.D)}`}</TeX>
        <div className="grid3">
          <Slider label="Amplitude A" value={o.A} min={0.2} max={5} step={0.1} onChange={set('A')} />
          <Slider label="Angular frequency B (rad/s)" value={o.B} min={0.2} max={6} step={0.01} onChange={set('B')} />
          <Slider label="Phase shift C (s)" value={o.C} min={-3} max={3} step={0.05} onChange={set('C')} />
          <Slider label="Vertical offset D" value={o.D} min={0} max={10} step={0.1} onChange={set('D')} />
          <Slider label="Time t (scrub)" value={t} min={0} max={T} step={0.005} onChange={(x) => { setPlaying(false); setT(x); }} unit=" s" />
          <Slider label="Window length" value={T} min={2} max={20} step={0.5} onChange={(x) => { setTmax(x); setT((q) => Math.min(q, x)); }} unit=" s" />
        </div>
        <div className="row wrap">
          <button className="primary" onClick={() => setPlaying(!playing)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
          {[0.1, 0.25, 0.5, 1, 2].map((r) => <button key={r} className={rate === r ? 'active primary' : ''} onClick={() => setRate(r)}>{r === 1 ? '1×' : r < 1 ? `${r}× slow-mo` : `${r}×`}</button>)}
          <button onClick={() => setT(0)}>⏮ t=0</button>
        </div>
      </Card>
      <div className="grid2">
        <div className="row" style={{ alignItems: 'stretch', gap: 10 }}>
          <svg viewBox={`0 0 90 ${sceneH}`} style={{ width: 90, height: sceneH, flexShrink: 0, background: '#0d1528', borderRadius: 10, position: 'sticky', top: 60 }} aria-label="moving object">
            <line x1={45} x2={45} y1={sy(hMax)} y2={sy(hMin)} stroke="#334155" strokeWidth={4} />
            <line x1={20} x2={70} y1={sy(hMax)} y2={sy(hMax)} stroke={COLORS.max} strokeDasharray="3 3" />
            <line x1={20} x2={70} y1={sy(hMin)} y2={sy(hMin)} stroke={COLORS.min} strokeDasharray="3 3" />
            <line x1={10} x2={80} y1={sy(o.D)} y2={sy(o.D)} stroke="#64748b" strokeDasharray="2 4" />
            <circle cx={45} cy={sy(h)} r={13} fill="#38bdf8" />
            <line x1={45} y1={sy(h)} x2={45} y2={sy(h) - Math.max(-60, Math.min(60, v * 10))} stroke={COLORS.d1} strokeWidth={3} markerEnd="url(#arr)" />
            <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill={COLORS.d1} /></marker></defs>
            <text x={4} y={sceneH - 2} fontSize={9} fill="#94a3b8">arrow = v</text>
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Graph x={[0, T]} y={yH} height={170} title={<span style={{ color: COLORS.f }}>h(t) position</span>} curves={[{ fn: (s) => osc.h(o, s), color: COLORS.f }]} vlines={tl} bands={band}
              points={[...critPts((s) => osc.h(o, s)), { x: t, y: h, color: COLORS.tan, r: 6 }, { x: ext.max.t, y: ext.max.h, color: '#fff', r: 5, label: 'abs max on [t₁,t₂]', hollow: true }, { x: ext.min.t, y: ext.min.h, color: '#fff', r: 5, label: 'abs min', hollow: true }]}
              onDragX={(s) => { setPlaying(false); setT(s); }} dragX={t} step={0.01} ariaLabel="position graph, drag to scrub time" />
            <Graph x={[0, T]} y={[-vm, vm]} height={140} title={<span style={{ color: COLORS.d1 }}>v(t)=h′(t) velocity</span>} curves={[{ fn: (s) => osc.v(o, s), color: COLORS.d1 }]} vlines={tl}
              points={[...critPts((s) => osc.v(o, s)), { x: t, y: v, color: COLORS.tan, r: 6 }]} onDragX={(s) => { setPlaying(false); setT(s); }} dragX={t} step={0.01} />
            <Graph x={[0, T]} y={[-am, am]} height={140} title={<span style={{ color: COLORS.d2 }}>a(t)=h″(t) acceleration</span>} curves={[{ fn: (s) => osc.a(o, s), color: COLORS.d2 }]} vlines={tl}
              points={[{ x: t, y: a, color: COLORS.tan, r: 6 }]} onDragX={(s) => { setPlaying(false); setT(s); }} dragX={t} step={0.01} />
          </div>
        </div>
        <div>
          <Card title={`At t = ${fmt(t, 2)} s`}>
            <TeX block>{`h(t)=${fmt(h)}`}</TeX><TeX block>{`v(t)=AB\\cos(B(t-C))=${fmt(v)}`}</TeX><TeX block>{`a(t)=-AB^2\\sin(B(t-C))=${fmt(a)}`}</TeX>
            <p>Moving <Badge kind={v > 1e-6 ? 'ok' : v < -1e-6 ? 'bad' : 'info'}>{v > 1e-6 ? 'UP (v>0)' : v < -1e-6 ? 'DOWN (v<0)' : 'momentarily stopped (v=0)'}</Badge>{' '}
              acceleration points <Badge kind="warn">{a > 1e-6 ? 'up' : a < -1e-6 ? 'down' : 'zero'}</Badge>{' '}
              {Math.abs(v) > 1e-6 && Math.abs(a) > 1e-6 && <Badge kind="info">{v * a > 0 ? 'speeding up' : 'slowing down'}</Badge>}</p>
          </Card>
          <Card title="Reading the motion">
            <TeX block>{`\\text{Amplitude }|A|=${fmt(Math.abs(o.A))},\\quad \\text{Period }=\\frac{2\\pi}{B}=${fmt(per)}\\text{ s}`}</TeX>
            <TeX block>{`h_{max}=D+|A|=${fmt(hMax)},\\qquad h_{min}=D-|A|=${fmt(hMin)}`}</TeX>
            <p><b>Critical times</b> (v = 0 ⇔ <TeX>{'B(t-C)=\\tfrac{\\pi}{2}+k\\pi'}</TeX>) in [0, {T}]: {crit.slice(0, 8).map((c) => fmt(c, 3)).join(', ')}{crit.length > 8 ? ', …' : ''}</p>
            <p className="note">Plain words: at the top and bottom the object turns around, so for an instant it isn't moving (v = 0). Acceleration is always pulling back toward the middle height D: it's largest at the extremes and zero when passing through D, where speed is greatest.</p>
          </Card>
          <Card title="Extrema on a restricted interval [t₁, t₂] (closed interval method)">
            <Slider label="t₁" value={iv[0]} min={0} max={T} step={0.05} onChange={(x) => setIv([x, iv[1]])} />
            <Slider label="t₂" value={iv[1]} min={0} max={T} step={0.05} onChange={(x) => setIv([iv[0], x])} />
            <table className="facts"><thead><tr><th>t</th><th>h(t)</th><th>why</th></tr></thead><tbody>
              {ext.candidates.map((c, i) => <tr key={i}><td>{fmt(c.t)}</td><td>{fmt(c.h)}</td><td>{c.endpoint ? 'endpoint' : 'critical (v=0)'}</td></tr>)}
            </tbody></table>
            <p>Absolute max <b>{fmt(ext.max.h)}</b> at t = {fmt(ext.max.t)} {ext.max.endpoint && <Badge kind="warn">at an endpoint</Badge>} · Absolute min <b>{fmt(ext.min.h)}</b> at t = {fmt(ext.min.t)} {ext.min.endpoint && <Badge kind="warn">at an endpoint</Badge>}</p>
            <p className="note">On a restricted interval the highest point can be an endpoint even though v ≠ 0 there — the clock simply stops before the object reaches the top. So: list critical times inside the interval AND both endpoints, evaluate h at each, pick the largest/smallest.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
