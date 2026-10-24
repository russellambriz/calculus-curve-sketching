import type { Fn } from './expr';
import type { Analysis } from './analysis';
import { fmt } from './expr';

/** Convert a freehand stroke into a function of x (sorted, averaged in bins, linearly interpolated). */
export function strokeToFn(pts: [number, number][], a: number, b: number, bins = 160): { fn: Fn; covered: number } {
  const sum = new Array(bins).fill(0), cnt = new Array(bins).fill(0);
  for (const [x, y] of pts) { if (x < a || x > b) continue; const i = Math.min(bins - 1, Math.floor(((x - a) / (b - a)) * bins)); sum[i] += y; cnt[i]++; }
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < bins; i++) if (cnt[i]) { xs.push(a + ((i + 0.5) / bins) * (b - a)); ys.push(sum[i] / cnt[i]); }
  const bw = (b - a) / bins;
  let cov = xs.length ? bw : 0;
  for (let i = 1; i < xs.length; i++) cov += xs[i] - xs[i - 1] <= bw * 6 ? xs[i] - xs[i - 1] : bw;
  const covered = Math.min(1, cov / (b - a));
  // light smoothing
  const sm = ys.map((_, i) => { let s = 0, c = 0; for (let k = -2; k <= 2; k++) if (ys[i + k] !== undefined && Math.abs(xs[i + k] - xs[i]) < ((b - a) / bins) * 4) { s += ys[i + k]; c++; } return s / c; });
  const fn: Fn = (x) => {
    if (!xs.length || x < xs[0] || x > xs[xs.length - 1]) return NaN;
    let lo = 0, hi = xs.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
    if (xs[hi] - xs[lo] > ((b - a) / bins) * 6) return NaN; // gap in drawing
    const t = xs[hi] === xs[lo] ? 0 : (x - xs[lo]) / (xs[hi] - xs[lo]);
    return sm[lo] + t * (sm[hi] - sm[lo]);
  };
  return { fn, covered };
}

export interface SketchFeedback { score: number; messages: { ok: boolean; text: string }[] }

/** Compare a drawn curve with the analysis of the true f (monotonicity, extrema, concavity, key values). */
export function compareSketch(u: Fn, f: Fn, an: Analysis, yRange: number, covered: number): SketchFeedback {
  const msgs: { ok: boolean; text: string }[] = [];
  const span = an.b - an.a, h = span / 60;
  if (covered < 0.6) msgs.push({ ok: false, text: `Your drawing covers only ${Math.round(covered * 100)}% of the x-range. Draw left-to-right across the whole window (you can lift and continue).` });
  // 1. monotonic agreement per interval
  let monoOk = 0, monoN = 0;
  for (const iv of an.monotonic) {
    if (iv.sign === 0) continue;
    let agree = 0, n = 0;
    for (let x = iv.a + h; x < iv.b - h; x += h / 2) {
      const s = u(x + h / 2) - u(x - h / 2);
      if (!Number.isFinite(s)) continue;
      n++; if (Math.sign(s) === iv.sign || Math.abs(s) < yRange * 0.002) agree++;
    }
    if (!n) continue;
    monoN++;
    const frac = agree / n;
    if (frac >= 0.75) monoOk++;
    else msgs.push({ ok: false, text: `On (${fmt(iv.a, 2)}, ${fmt(iv.b, 2)}) your curve mostly ${iv.sign > 0 ? 'goes down' : 'goes up'}, but f′ is ${iv.sign > 0 ? 'positive' : 'negative'} there, so f should be ${iv.sign > 0 ? 'rising' : 'falling'} (f ${iv.sign > 0 ? 'increasing' : 'decreasing'}).` });
  }
  if (monoN && monoOk === monoN) msgs.push({ ok: true, text: 'Rising/falling matches the sign of f′ on every interval. ✔' });
  // 2. extrema location
  let extOk = 0;
  const ext = an.criticals.filter((c) => c.kind !== 'neither');
  for (const c of ext) {
    let best = NaN, bx = NaN;
    for (let x = c.x - span * 0.08; x <= c.x + span * 0.08; x += span / 400) {
      const v = u(x); if (!Number.isFinite(v)) continue;
      if (!Number.isFinite(best) || (c.kind === 'local max' ? v > best : v < best)) { best = v; bx = x; }
    }
    const turning = Number.isFinite(bx) && Math.abs(bx - c.x) < span * 0.06;
    if (turning) extOk++;
    msgs.push(turning ? { ok: true, text: `${c.kind} near x = ${fmt(c.x, 2)} ✔ (yours at ≈ ${fmt(bx, 2)})` }
      : { ok: false, text: `There should be a ${c.kind === 'local max' ? 'peak (local max)' : 'valley (local min)'} at x = ${fmt(c.x, 2)} because f′ changes ${c.kind === 'local max' ? '+ to −' : '− to +'} there.` });
  }
  // 3. concavity (coarse second differences)
  let concOk = 0, concN = 0;
  const H = span / 18;
  for (const iv of an.concavity) {
    if (iv.sign === 0 || iv.b - iv.a < 2.2 * H) continue;
    let agree = 0, n = 0;
    for (let x = iv.a + H; x <= iv.b - H; x += H / 3) {
      const d = u(x + H) - 2 * u(x) + u(x - H); if (!Number.isFinite(d)) continue;
      n++; if (Math.sign(d) === iv.sign || Math.abs(d) < yRange * 0.004) agree++;
    }
    if (!n) continue;
    concN++;
    if (agree / n >= 0.65) concOk++;
    else msgs.push({ ok: false, text: `On (${fmt(iv.a, 2)}, ${fmt(iv.b, 2)}) it should bend ${iv.sign > 0 ? 'like a cup ∪ (concave up, f″>0)' : 'like a cap ∩ (concave down, f″<0)'}.` });
  }
  if (concN && concOk === concN) msgs.push({ ok: true, text: 'Bending (concavity) matches f″ everywhere checked. ✔' });
  // 4. values at key points
  const keys = [...an.criticals.map((c) => c.x), ...an.inflections.filter((i) => i.isInflection).map((i) => i.x)];
  let valOk = 0;
  for (const x of keys) {
    const v = u(x), t = f(x);
    if (Number.isFinite(v) && Math.abs(v - t) < yRange * 0.08) valOk++;
    else if (Number.isFinite(v)) msgs.push({ ok: false, text: `At x = ${fmt(x, 2)} your curve is at y ≈ ${fmt(v, 2)}, but f(${fmt(x, 2)}) = ${fmt(t, 2)}.` });
  }
  if (keys.length && valOk === keys.length) msgs.push({ ok: true, text: 'Passes through all key points (f-values) ✔' });
  const parts = [monoN ? monoOk / monoN : 1, ext.length ? extOk / ext.length : 1, concN ? concOk / concN : 1, keys.length ? valOk / keys.length : 1];
  const score = Math.round((parts.reduce((s, v) => s + v, 0) / parts.length) * Math.min(1, covered / 0.8) * 100);
  return { score, messages: msgs };
}
