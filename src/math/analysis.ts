import type { Fn } from './expr';

export interface Special { zeros: number[]; breaks: { x: number; blowup: boolean }[] }

const sgn = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/**
 * Locate zeros (incl. touching zeros with no sign change) and breaks (jumps / blow-ups / undefined points)
 * of g on [a,b] using a fine grid + bisection / golden-section refinement. Numeric method.
 */
export function findSpecial(g: Fn, a: number, b: number, n = 1200): Special {
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; xs.push(x); ys.push(g(x)); }
  const finite = ys.filter(Number.isFinite).map(Math.abs).sort((p, q) => p - q);
  const scale = Math.max(1e-9, finite.length ? finite[Math.floor(finite.length * 0.9)] : 1);
  const tol = 1e-6 * Math.max(1, scale);
  const zeros: number[] = [];
  const breaks: { x: number; blowup: boolean }[] = [];
  const h = (b - a) / n;

  /** Decide whether x is a genuine break: a continuous function's jump shrinks ~linearly as the gap shrinks. */
  const breakAt = (x: number): { x: number; blowup: boolean } | null => {
    const e1 = Math.max(1e-6, Math.abs(x) * 1e-6), e2 = e1 / 1000;
    const j = (e: number) => { const l = g(x - e), r = g(x + e); return Number.isFinite(l) && Number.isFinite(r) ? Math.abs(r - l) : Infinity; };
    const J1 = j(e1), J2 = j(e2);
    const big = 1e3 * Math.max(1, scale);
    const mags = [g(x - e2), g(x + e2)].map(Math.abs);
    const blowup = mags.some((m) => !Number.isFinite(m) || m > big) && Math.max(...mags) > 2 * Math.max(Math.abs(g(x - e1)), Math.abs(g(x + e1)), 0) - 1e-300;
    if (blowup) return { x: snap(x), blowup: true };
    if (J2 === Infinity || (J2 > 1e-9 * Math.max(1, scale) && J2 > 0.2 * J1)) return { x: snap(x), blowup: false };
    return null;
  };
  const classifyBreak = (lo: number, hi: number) => {
    // bisect toward the half with the larger jump
    let L = lo, H = hi;
    for (let k = 0; k < 60; k++) {
      const m = (L + H) / 2, gm = g(m), gl = g(L), gh = g(H);
      const dl = Number.isFinite(gm) && Number.isFinite(gl) ? Math.abs(gm - gl) : Infinity;
      const dh = Number.isFinite(gm) && Number.isFinite(gh) ? Math.abs(gh - gm) : Infinity;
      if (dl >= dh) H = m; else L = m;
    }
    const x = (L + H) / 2;
    const r = breakAt(x);
    if (r) breaks.push(r);
  };

  for (let i = 0; i <= n; i++) {
    const y = ys[i];
    if (y === 0) zeros.push(xs[i]);
    if (i === n) break;
    const y1 = ys[i + 1];
    const fin0 = Number.isFinite(y), fin1 = Number.isFinite(y1);
    if (fin0 && fin1) {
      if (sgn(y) * sgn(y1) < 0) {
        let L = xs[i], H = xs[i + 1], gl = y;
        for (let k = 0; k < 80; k++) {
          const m = (L + H) / 2, gm = g(m);
          if (!Number.isFinite(gm)) { break; }
          if (sgn(gm) === 0) { L = H = m; break; }
          if (sgn(gm) === sgn(gl)) { L = m; gl = gm; } else H = m;
        }
        const x = (L + H) / 2;
        const e = Math.max(1e-7, Math.abs(x) * 1e-7);
        const near = Math.max(Math.abs(g(x - e)), Math.abs(g(x + e)));
        if (Number.isFinite(near) && near < 1e-3 * Math.max(1, scale)) zeros.push(snap(x));
        else classifyBreak(xs[i], xs[i + 1]);
      } else if (Math.abs(y1 - y) > Math.max(0.25 * scale, 50 * h * scale)) {
        classifyBreak(xs[i], xs[i + 1]);
      }
    } else if (fin0 !== fin1 || (!fin0 && !fin1 && false)) {
      // entering/leaving an undefined region or isolated undefined grid point
      if (!fin1 && i + 2 <= n && Number.isFinite(ys[i + 2])) {
        // isolated undefined grid point (e.g. 0 for abs(x)/x)
        const x = xs[i + 1];
        const e = h * 1e-3, l = g(x - e), r = g(x + e);
        const blowup = !(Math.abs(l) < 1e3 * Math.max(1, scale) && Math.abs(r) < 1e3 * Math.max(1, scale));
        breaks.push({ x: snap(x), blowup });
      } else if (fin0 && !fin1) {
        // left edge of an undefined region: one-sided blow-up?  (e.g. log x approaching 0 from the right handled symmetrically)
      }
    }
  }
  // blow-ups without sign change (e.g. x^(-2/3)): local maxima of |g| that grow without bound
  for (let i = 1; i < n; i++) {
    const p = Math.abs(ys[i - 1]), c = Math.abs(ys[i]), q = Math.abs(ys[i + 1]);
    if (!(Number.isFinite(p) && Number.isFinite(c) && Number.isFinite(q))) continue;
    if (c >= p && c >= q && c > 10 * scale) {
      let L = xs[i - 1], H = xs[i + 1];
      const phi = (Math.sqrt(5) - 1) / 2;
      for (let k = 0; k < 90; k++) {
        const m1 = H - phi * (H - L), m2 = L + phi * (H - L);
        const a1 = Math.abs(g(m1)), a2 = Math.abs(g(m2));
        if (!Number.isFinite(a1) || a1 > a2) H = m2; else L = m1;
      }
      const x = (L + H) / 2;
      if (!Number.isFinite(g(x)) || Math.abs(g(x)) > 1e4 * Math.max(1, scale)) breaks.push({ x: snap(x), blowup: true });
    }
  }
  // touching zeros: local minima of |g| that are ~0 but with no sign change
  for (let i = 1; i < n; i++) {
    const p = Math.abs(ys[i - 1]), c = Math.abs(ys[i]), q = Math.abs(ys[i + 1]);
    if (!(Number.isFinite(p) && Number.isFinite(c) && Number.isFinite(q))) continue;
    if (c <= p && c <= q && sgn(ys[i - 1]) === sgn(ys[i + 1]) && sgn(ys[i]) !== 0) {
      let L = xs[i - 1], H = xs[i + 1];
      const phi = (Math.sqrt(5) - 1) / 2;
      for (let k = 0; k < 80; k++) {
        const m1 = H - phi * (H - L), m2 = L + phi * (H - L);
        if (Math.abs(g(m1)) < Math.abs(g(m2))) H = m2; else L = m1;
      }
      const x = (L + H) / 2;
      if (Math.abs(g(x)) < tol) zeros.push(snap(x));
    }
  }
  const bs = dedupeB(breaks, h * 2.5);
  // identically-zero function (e.g. f' of a constant): there are no isolated zeros to report
  if (finite.length && finite[finite.length - 1] < 1e-9) return { zeros: [], breaks: bs };
  return { zeros: dedupe(zeros, h).filter((z) => !bs.some((b) => Math.abs(b.x - z) < h)), breaks: bs };
}

export function snap(x: number): number {
  const r = Math.round(x * 1e6) / 1e6;
  return Math.abs(r - x) < 1e-6 ? (Object.is(r, -0) ? 0 : r) : x;
}
function dedupe(v: number[], h: number) {
  const s = [...v].sort((p, q) => p - q), out: number[] = [];
  for (const x of s) if (!out.length || Math.abs(x - out[out.length - 1]) > h * 0.5) out.push(x);
  return out;
}
function dedupeB(v: { x: number; blowup: boolean }[], h: number) {
  const s = [...v].sort((p, q) => p.x - q.x), out: typeof v = [];
  for (const b of s) if (!out.length || Math.abs(b.x - out[out.length - 1].x) > h * 0.5) out.push(b);
  return out;
}

export type CritKind = 'local max' | 'local min' | 'neither';
export interface CriticalPoint {
  x: number; y: number;
  reason: "f'=0" | "f' undefined";
  kind: CritKind;
  leftSign: number; rightSign: number;
  /** value of f'' at x (NaN if undefined) for the second-derivative test */
  d2: number;
  secondTest: 'local max' | 'local min' | 'inconclusive';
}
export interface InflectionCandidate { x: number; y: number; reason: "f''=0" | "f'' undefined"; isInflection: boolean; leftSign: number; rightSign: number }
export interface Discontinuity { x: number; type: 'vertical asymptote' | 'jump/removable' }
export interface Interval { a: number; b: number; sign: number }
export interface EndpointInfo { x: number; y: number; kind: 'local max' | 'local min' | 'neither' }
export interface Analysis {
  a: number; b: number;
  criticals: CriticalPoint[];
  inflections: InflectionCandidate[];
  discontinuities: Discontinuity[];
  monotonic: Interval[];   // sign of f'
  concavity: Interval[];   // sign of f''
  endpoints: EndpointInfo[];
  absMax?: { x: number; y: number };
  absMin?: { x: number; y: number };
  undefinedRegions: Interval[];
}

function signNear(g: Fn, x: number, dir: 1 | -1, span: number): number {
  for (const d of [1e-6, 1e-5, 1e-4, 1e-3].map((k) => k * span)) {
    const v = g(x + dir * d);
    if (Number.isFinite(v) && Math.abs(v) > 1e-12) return sgn(v);
  }
  return 0;
}

function intervals(g: Fn, splits: number[], a: number, b: number): Interval[] {
  const pts = [a, ...splits.filter((s) => s > a && s < b), b];
  const out: Interval[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const L = pts[i], R = pts[i + 1];
    if (R - L < 1e-9) continue;
    let s = 0;
    for (const t of [0.5, 0.3, 0.7, 0.1, 0.9]) { const v = g(L + t * (R - L)); if (Number.isFinite(v) && v !== 0) { s = sgn(v); break; } }
    if (out.length && out[out.length - 1].sign === s && !splits.some((p) => Math.abs(p - L) < 1e-9 && false)) out[out.length - 1].b = R;
    else out.push({ a: L, b: R, sign: s });
  }
  return out;
}

/** Full first/second-derivative analysis of f on the closed interval [a,b]. */
export function analyze(f: Fn, d1: Fn, d2: Fn, a: number, b: number, n = 1200): Analysis {
  const span = b - a;
  const fs = findSpecial(f, a, b, n);
  const discontinuities: Discontinuity[] = fs.breaks.map((br) => ({ x: br.x, type: br.blowup ? 'vertical asymptote' : 'jump/removable' }));
  const nearDisc = (x: number) => discontinuities.some((d) => Math.abs(d.x - x) < span / n);

  // undefined regions of f (e.g. log x for x<=0)
  const undefinedRegions: Interval[] = [];
  { let start: number | null = null;
    for (let i = 0; i <= n; i++) { const x = a + (span * i) / n; const ok = Number.isFinite(f(x));
      if (!ok && start === null) start = x; if (ok && start !== null) { undefinedRegions.push({ a: start, b: x, sign: 0 }); start = null; } }
    if (start !== null) undefinedRegions.push({ a: start, b, sign: 0 }); }
  const inDomain = (x: number) => Number.isFinite(f(x));

  const s1 = findSpecial(d1, a, b, n);
  const crit: CriticalPoint[] = [];
  const add = (x: number, reason: CriticalPoint['reason']) => {
    if (x <= a + 1e-12 || x >= b - 1e-12) return;
    if (nearDisc(x)) return;
    const y = f(x);
    if (!Number.isFinite(y)) return; // not in domain => not a critical number
    const L = signNear(d1, x, -1, span), R = signNear(d1, x, 1, span);
    const kind: CritKind = L > 0 && R < 0 ? 'local max' : L < 0 && R > 0 ? 'local min' : 'neither';
    const dd = reason === "f'=0" ? d2(x) : NaN;
    const secondTest = Number.isFinite(dd) && Math.abs(dd) > 1e-8 ? (dd < 0 ? 'local max' : 'local min') : 'inconclusive';
    crit.push({ x, y, reason, kind, leftSign: L, rightSign: R, d2: dd, secondTest });
  };
  s1.zeros.forEach((x) => add(x, "f'=0"));
  s1.breaks.forEach((br) => add(br.x, "f' undefined"));
  crit.sort((p, q) => p.x - q.x);

  const s2 = findSpecial(d2, a, b, n);
  const infl: InflectionCandidate[] = [];
  const addI = (x: number, reason: InflectionCandidate['reason']) => {
    if (x <= a + 1e-12 || x >= b - 1e-12 || nearDisc(x)) return;
    const y = f(x);
    if (!Number.isFinite(y)) return;
    const L = signNear(d2, x, -1, span), R = signNear(d2, x, 1, span);
    infl.push({ x, y, reason, isInflection: L * R < 0, leftSign: L, rightSign: R });
  };
  s2.zeros.forEach((x) => addI(x, "f''=0"));
  s2.breaks.forEach((br) => { if (!crit.some((c) => Math.abs(c.x - br.x) < 1e-6 && false)) addI(br.x, "f'' undefined"); });
  infl.sort((p, q) => p.x - q.x);

  const discX = discontinuities.map((d) => d.x);
  const regionEdges = undefinedRegions.flatMap((r) => [r.a, r.b]);
  const monotonic = intervals(d1, [...crit.map((c) => c.x), ...discX, ...regionEdges].sort((p, q) => p - q), a, b);
  const concavity = intervals(d2, [...infl.map((c) => c.x), ...discX, ...s2.breaks.map((q) => q.x), ...regionEdges].sort((p, q) => p - q), a, b);

  const endpoints: EndpointInfo[] = [];
  for (const [x, dir] of [[a, 1], [b, -1]] as const) {
    const y = f(x);
    if (!Number.isFinite(y)) continue;
    const s = signNear(d1, x, dir, span);
    // at left endpoint: increasing to the right => endpoint is a local min
    const kind = s === 0 ? 'neither' : (s * dir > 0 ? 'local min' : 'local max');
    endpoints.push({ x, y, kind });
  }
  let absMax: Analysis['absMax'], absMin: Analysis['absMin'];
  const blow = discontinuities.some((d) => d.type === 'vertical asymptote');
  if (!blow && undefinedRegions.length === 0) {
    const cands = [...endpoints.map((e) => ({ x: e.x, y: e.y })), ...crit.map((c) => ({ x: c.x, y: c.y }))];
    // include jump discontinuity one-sided values implicitly by checking grid (guards jumps)
    for (const c of cands) {
      if (!absMax || c.y > absMax.y + 1e-12) absMax = c;
      if (!absMin || c.y < absMin.y - 1e-12) absMin = c;
    }
  }
  return { a, b, criticals: crit, inflections: infl, discontinuities, monotonic, concavity, endpoints, absMax, absMin, undefinedRegions };
}
