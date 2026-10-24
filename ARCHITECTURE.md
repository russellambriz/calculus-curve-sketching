# Calculus I Mastery Lab — Architecture

## Stack
- **Vite + React 18 + TypeScript** (strict).
- **Graphs:** a custom SVG graph component (`src/components/Graph.tsx`). Chosen over a charting library because it gives
  precise control over pointer capture (mouse, pen, touch via Pointer Events with `touch-action:none`), keyboard
  dragging (arrow keys), asymptote-aware path breaking, shaded intervals, and synchronized cursors across graphs.
- **3D:** React Three Fiber + drei `OrbitControls` (Module 4).
- **Math:** `mathjs` parses expressions and differentiates **symbolically**; the derivative trees are compiled by our own
  real-valued evaluator (`src/math/expr.ts`) so `x^(2/3)` is real for negative x and undefined points yield `NaN`
  instead of complex numbers. The unsimplified derivative is evaluated (keeps domain holes such as `abs(x)/x` at 0);
  the simplified one is displayed with **KaTeX**. If symbolic differentiation fails, a central-difference
  derivative is used and the UI shows a **"numeric"** badge.
- **Analysis engine** (`src/math/analysis.ts`, numeric root finding, labelled in UI): fine grid + bisection for sign
  changes, golden-section search for touching zeros (no sign change) and for unbounded spikes, a shrinking-gap test to
  separate genuine jumps/asymptotes from steep continuous sections. Produces critical numbers (f'=0 or f' undefined
  with f defined), first- and second-derivative test results, inflection candidates (with "is it really an inflection?"),
  discontinuities, undefined regions, monotonic/concavity intervals, endpoint extrema, absolute extrema.
- **Closed-form optimization models** (`src/math/optimization.ts`): river field, open-top boxes, sinusoidal motion.
- **State:** `src/state/progress.ts` — localStorage (`calc-lab-progress-v1`) via `useSyncExternalStore`.
- **PWA:** `vite-plugin-pwa` (auto-update service worker, manifest, icons). `base: './'` for GitHub Pages.

## Structure
```
src/
  math/        expr.ts, analysis.ts, optimization.ts, problems.ts (generators for mastery)
  components/  Graph.tsx, TeX.tsx, SignChart.tsx, Slider.tsx, ui bits
  modules/     DerivativeExplorer, CurveSketching, FieldOptimization, BoxOptimization,
               Oscillation, FunctionExplorer, Learn (Guided / Prediction / Mastery)
  state/       progress.ts
tests/         Vitest specs (derivatives, classification edge cases, optimization constraints)
```

## Learning progression
1. **See slope** (Module 1): drag a point, watch the tangent; f' graph is literally "slope readout over time".
2. **f' vs f''**: sign charts — f' sign ⇒ rising/falling; f'' sign ⇒ bending up/down. Counterexamples
   (x³, x⁴, |x|, x^(2/3)) break the "f'=0 ⇒ extremum" and "f''=0 ⇒ inflection" myths.
3. **Function families** (Module 6): coefficients ⇒ shape; domain, asymptotes, turning points.
4. **Curve sketching** (Module 2): answer the analysis steps, then draw the graph and get feature-level feedback.
5. **Optimization in 2D** (Module 3): constraint ⇒ one-variable objective ⇒ derivative = 0 ⇒ check domain.
6. **Optimization in 3D** (Module 4): min vs max, domain from physical constraints.
7. **Motion** (Module 5): position/velocity/acceleration, closed-interval method including endpoints.
8. **Guided → Prediction → Mastery** (Module 7): microsteps, predict-then-reveal, adaptive problem generation
   targeting weak concepts (per-concept accuracy + difficulty level stored locally).
   Mistake feedback is always "plain language first, formal term second".
