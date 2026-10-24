import { lazy, Suspense, useEffect, useState } from 'react';
import { progress, useProgress } from './state/progress';
import DerivativeExplorer from './modules/DerivativeExplorer';
import CurveSketching from './modules/CurveSketching';
import FieldOptimization from './modules/FieldOptimization';
import Oscillation from './modules/Oscillation';
import FunctionExplorer from './modules/FunctionExplorer';
import Learn from './modules/Learn';
const BoxOptimization = lazy(() => import('./modules/BoxOptimization'));

const modules = [
  { id: 'home', name: '🏠 Home', comp: null },
  { id: 'deriv', name: '1 · Derivative Explorer', comp: DerivativeExplorer, blurb: 'f, f′, f″ linked; tangent line; sign charts; counterexamples.' },
  { id: 'sketch', name: '2 · Curve Sketching', comp: CurveSketching, blurb: 'Microstep analysis, then draw the curve and get precise feedback.' },
  { id: 'field', name: '3 · River Field', comp: FieldOptimization, blurb: 'Fence on three sides: constraint, A(x), A′(x), prediction challenge.' },
  { id: 'box', name: '4 · 3D Box', comp: BoxOptimization, blurb: 'Rotatable open-top box: min surface area / max volume.' },
  { id: 'motion', name: '5 · Oscillating Motion', comp: Oscillation, blurb: 'h, v, a synced with an animated object; restricted-interval extrema.' },
  { id: 'funcs', name: '6 · Function Explorer', comp: FunctionExplorer, blurb: 'Coefficient sliders for 11 families; domain, asymptotes, turning points.' },
  { id: 'learn', name: '7 · Guided / Mastery', comp: Learn, blurb: 'Explore, Guided microsteps, Prediction, adaptive Mastery.' },
] as const;

export default function App() {
  const [id, setId] = useState(() => location.hash.slice(1) || 'home');
  useProgress();
  useEffect(() => { location.hash = id; if (id !== 'home') progress.visit(id); window.scrollTo(0, 0); }, [id]);
  useEffect(() => { const h = () => setId(location.hash.slice(1) || 'home'); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  const m = modules.find((q) => q.id === id) ?? modules[0];
  const Comp = m.comp;
  return (
    <div className="app">
      <nav className="side">
        <h1>∂ Calculus I Mastery Lab</h1>
        {modules.map((q) => <button key={q.id} className={q.id === id ? 'active' : ''} onClick={() => setId(q.id)}>{q.name}</button>)}
      </nav>
      <main><Suspense fallback={<p>Loading 3D…</p>}>{Comp ? <Comp /> : <Home go={setId} />}</Suspense></main>
    </div>
  );
}

function Home({ go }: { go: (id: string) => void }) {
  const p = useProgress();
  return <div className="module">
    <section className="card"><h3>Welcome, Russ 👋</h3>
      <p>This lab connects <b>equations ⇄ graphs ⇄ real situations</b>. Everything is linked: drag one thing and every graph and number updates. Suggested path: <b>1 → 6 → 2 → 3 → 4 → 5</b>, then use <b>7</b> to lock it in.</p>
      <p className="note">Works offline once loaded (installable PWA: browser menu → “Install app” / “Add to Home screen”). Progress is stored only on this device. Modules visited: {Object.keys(p.visited).length}/7.</p></section>
    <div className="home-grid">{modules.slice(1).map((q) => <button key={q.id} onClick={() => go(q.id)}><b>{q.name}</b><br /><small>{(q as any).blurb}</small></button>)}</div></div>;
}
