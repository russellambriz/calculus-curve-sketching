import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Graph } from '../components/Graph';
import { TeX } from '../components/TeX';
import { Card, Slider, Badge } from '../components/ui';
import { boxFixedVolume as BV, boxFixedSurface as BS } from '../math/optimization';
import { fmt } from '../math/expr';
import { COLORS } from './shared';
import { hasWebGL, WebGLFallback, ErrorBoundary } from '../components/WebGLGuard';
const WEBGL_OK = typeof document !== 'undefined' && hasWebGL();

function Box3D({ x, h }: { x: number; h: number }) {
  const s = 3 / Math.max(x, h, 1e-6); // normalise so the bigger dimension is 3 units
  const X = x * s, Hh = h * s;
  const mat = <meshStandardMaterial color="#38bdf8" transparent opacity={0.55} side={THREE.DoubleSide} />;
  return (
    <group position={[0, -Hh / 2, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[X, X]} /><meshStandardMaterial color="#0ea5e9" side={THREE.DoubleSide} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.sin((i * Math.PI) / 2) * X / 2, Hh / 2, Math.cos((i * Math.PI) / 2) * X / 2]} rotation={[0, (i * Math.PI) / 2, 0]}>
          <planeGeometry args={[X, Hh]} />{mat}
        </mesh>
      ))}
      <lineSegments position={[0, Hh / 2, 0]}><edgesGeometry args={[new THREE.BoxGeometry(X, Hh, X)]} /><lineBasicMaterial color="#facc15" /></lineSegments>
    </group>
  );
}

export default function BoxOptimization() {
  const [sc, setSc] = useState<'A' | 'B'>('A');
  const [V, setV] = useState(32);
  const [S, setS] = useState(108);
  const [xA, setXA] = useState(2);
  const [xB, setXB] = useState(3);
  const isA = sc === 'A';
  const x = isA ? xA : xB, setX = isA ? setXA : setXB;
  const h = isA ? BV.height(V, x) : BS.height(S, x);
  const vol = x * x * h, sa = x * x + 4 * x * h;
  const xs = isA ? BV.optimalX(V) : BS.optimalX(S);
  const obj = isA ? (t: number) => BV.surface(V, t) : (t: number) => BS.volume(S, t);
  const dobj = isA ? (t: number) => BV.dSurface(V, t) : (t: number) => BS.dVolume(S, t);
  const xMax = isA ? xs * 3 : Math.sqrt(S);
  const yObj = isA ? [0, BV.surface(V, xs) * 3] as [number, number] : [-BS.volume(S, xs) * 0.2, BS.volume(S, xs) * 1.25] as [number, number];
  const dRange = isA ? 40 : S / 4;
  return (
    <div className="module">
      <Card title="4 · Optimization: 3D Open-Top Box (square base)">
        <div className="tabs">
          <button className={isA ? 'active' : ''} onClick={() => setSc('A')}>A. Fixed volume → minimize surface area</button>
          <button className={!isA ? 'active' : ''} onClick={() => setSc('B')}>B. Fixed surface area → maximize volume</button>
        </div>
        {isA ? <Slider label="Required volume V" value={V} min={4} max={200} step={1} onChange={(v) => { setV(v); }} unit=" cm³" />
          : <Slider label="Available material S" value={S} min={12} max={400} step={1} onChange={(v) => { setS(v); setXB((q) => Math.min(q, Math.sqrt(v) * 0.98)); }} unit=" cm²" />}
        <Slider label="Base side x" value={x} min={isA ? xs * 0.15 : 0.02 * Math.sqrt(S)} max={isA ? xs * 3 : Math.sqrt(S) * 0.995} step={xs / 300} onChange={setX} unit=" cm" />
      </Card>
      <div className="grid2">
        <div>
          <div className="canvas3d" aria-label="3D box, drag to rotate, pinch/scroll to zoom">
            {WEBGL_OK ? <ErrorBoundary fallback={<WebGLFallback />}><Canvas camera={{ position: [5, 4, 6], fov: 45 }}>
              <ambientLight intensity={0.6} /><directionalLight position={[5, 8, 5]} intensity={1.1} />
              <Box3D x={x} h={h} />
              <gridHelper args={[10, 10, '#334155', '#1e293b']} position={[0, -1.6, 0]} />
              <OrbitControls enablePan={false} />
            </Canvas></ErrorBoundary> : <WebGLFallback />}
          </div>
          <p className="note">Drag/one-finger to rotate · pinch or scroll to zoom. The box is drawn to scale (largest dimension normalised).</p>
          <Card title="Live numbers">
            <div className="kv">
              <span>Base</span><b>{fmt(x)} × {fmt(x)} cm</b>
              <span>Height h</span><b>{fmt(h)} cm</b>
              <span>Volume V</span><b>{fmt(vol)} cm³ {isA && '(held fixed)'}</b>
              <span>Surface area S</span><b>{fmt(sa)} cm² {!isA && '(held fixed)'}</b>
              <span>{isA ? 'S′(x)' : 'V′(x)'}</span><b>{fmt(dobj(x))}</b>
            </div>
            <p>{Math.abs(x - xs) / xs < 0.02 ? <Badge kind="ok">At the optimum!</Badge> : <Badge kind="info">{isA ? (dobj(x) < 0 ? 'S′<0: grow the base to use less material' : 'S′>0: shrink the base') : (dobj(x) > 0 ? 'V′>0: grow the base for more volume' : 'V′<0: shrink the base')}</Badge>}</p>
          </Card>
        </div>
        <div>
          <Card title="The math">
            {isA ? <>
              <TeX block>{`\\text{Constraint: } x^2h=${V}\\;\\Rightarrow\\; h=\\frac{${V}}{x^2}`}</TeX>
              <TeX block>{`\\text{Objective: } S(x)=x^2+4xh=x^2+\\frac{${4 * V}}{x}`}</TeX>
              <TeX block>{`S'(x)=2x-\\frac{${4 * V}}{x^2}=0\\;\\Rightarrow\\; x^3=${2 * V}\\;\\Rightarrow\\; x^*=\\sqrt[3]{${2 * V}}=${fmt(xs)}`}</TeX>
              <TeX block>{`h^*=${fmt(BV.height(V, xs))}=\\tfrac{x^*}{2},\\quad S_{min}=${fmt(BV.surface(V, xs))},\\quad S''(x)=2+\\frac{${8 * V}}{x^3}>0`}</TeX>
            </> : <>
              <TeX block>{`\\text{Constraint: } x^2+4xh=${S}\\;\\Rightarrow\\; h=\\frac{${S}-x^2}{4x}`}</TeX>
              <TeX block>{`\\text{Objective: } V(x)=x^2h=\\frac{${S}x-x^3}{4}`}</TeX>
              <TeX block>{`V'(x)=\\frac{${S}-3x^2}{4}=0\\;\\Rightarrow\\; x^*=\\sqrt{${S}/3}=${fmt(xs)}`}</TeX>
              <TeX block>{`h^*=${fmt(BS.height(S, xs))}=\\tfrac{x^*}{2},\\quad V_{max}=${fmt(BS.volume(S, xs))},\\quad V''(x)=-\\tfrac{3x}{2}<0`}</TeX>
            </>}
          </Card>
          <Graph x={[0, xMax]} y={yObj} height={210} title={<span style={{ color: COLORS.f }}>{isA ? 'S(x) — surface area to minimize' : 'V(x) — volume to maximize'}</span>}
            curves={[{ fn: (t) => (t > 0 ? obj(t) : NaN), color: COLORS.f }]} onDragX={(t) => setX(Math.max(isA ? xs * 0.15 : 0.02 * Math.sqrt(S), Math.min(isA ? xs * 3 : Math.sqrt(S) * 0.995, t)))} dragX={x}
            points={[{ x, y: obj(x), color: COLORS.tan, r: 7 }, { x: xs, y: obj(xs), color: isA ? COLORS.min : COLORS.max, label: isA ? 'min' : 'max' }]} vlines={[{ x, color: '#facc15' }]} ariaLabel="objective graph" />
          <Graph x={[0, xMax]} y={[-dRange, dRange]} height={150} title={<span style={{ color: COLORS.d1 }}>{isA ? "S′(x)" : "V′(x)"} — zero at the critical point</span>}
            curves={[{ fn: (t) => (t > 0 ? dobj(t) : NaN), color: COLORS.d1 }]} points={[{ x, y: dobj(x), color: COLORS.tan }, { x: xs, y: 0, color: '#fff', label: `x*=${fmt(xs, 2)}` }]} vlines={[{ x, color: '#facc15' }]} />
          <Card title="Minimize vs maximize, and where the domain comes from">
            <p><b>Plain words:</b> {isA ? 'A tiny base needs a super-tall box (huge walls); a huge base wastes material on the floor. Somewhere between, the material used is smallest — S(x) has a valley.' : 'A tiny base holds almost nothing; a huge base uses up all the material on the floor leaving no walls (h→0). In between the volume peaks — V(x) has a hill.'}</p>
            <p><b>Formally:</b> one critical number <TeX>x^*</TeX> on the domain; {isA ? <>S″&gt;0 there (concave up) ⇒ <b>minimum</b>.</> : <>V″&lt;0 there (concave down) ⇒ <b>maximum</b>.</>} Same procedure (set derivative = 0), but the 2nd derivative / behaviour near the domain edges tells you which kind you found.</p>
            <p><b>Domain from physics:</b> {isA ? <>x &gt; 0 and h = V/x² &gt; 0 ⇒ domain <TeX>{'(0,\\infty)'}</TeX>. S → ∞ at both ends, so the single valley is the absolute min.</> : <>x &gt; 0 and h ≥ 0 ⇒ S − x² ≥ 0 ⇒ <TeX>{`0<x\\le\\sqrt{${S}}=${fmt(Math.sqrt(S))}`}</TeX>. V = 0 at both ends, so the single hill is the absolute max.</>}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
