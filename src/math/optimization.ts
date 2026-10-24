/** River field: two sides of length x perpendicular to the river, one side L parallel. 2x + L = P. */
export const field = {
  length: (P: number, x: number) => P - 2 * x,
  area: (P: number, x: number) => x * (P - 2 * x),
  dArea: (P: number, x: number) => P - 4 * x,
  optimalX: (P: number) => P / 4,
  maxArea: (P: number) => (P * P) / 8,
  domain: (P: number): [number, number] => [0, P / 2],
};

/** Open-top box, square base side x, height h. V = x^2 h, S = x^2 + 4xh */
export const boxFixedVolume = {
  height: (V: number, x: number) => V / (x * x),
  surface: (V: number, x: number) => x * x + (4 * V) / x,
  dSurface: (V: number, x: number) => 2 * x - (4 * V) / (x * x),
  d2Surface: (V: number, x: number) => 2 + (8 * V) / (x * x * x),
  optimalX: (V: number) => Math.cbrt(2 * V),
};
export const boxFixedSurface = {
  height: (S: number, x: number) => (S - x * x) / (4 * x),
  volume: (S: number, x: number) => (S * x - x * x * x) / 4,
  dVolume: (S: number, x: number) => (S - 3 * x * x) / 4,
  d2Volume: (_S: number, x: number) => (-6 * x) / 4,
  optimalX: (S: number) => Math.sqrt(S / 3),
  domain: (S: number): [number, number] => [0, Math.sqrt(S)],
};

/** h(t) = A sin(B(t - C)) + D */
export interface Osc { A: number; B: number; C: number; D: number }
export const osc = {
  h: (o: Osc, t: number) => o.A * Math.sin(o.B * (t - o.C)) + o.D,
  v: (o: Osc, t: number) => o.A * o.B * Math.cos(o.B * (t - o.C)),
  a: (o: Osc, t: number) => -o.A * o.B * o.B * Math.sin(o.B * (t - o.C)),
  period: (o: Osc) => (2 * Math.PI) / Math.abs(o.B),
  /** Times in [t0,t1] where v=0: B(t-C) = pi/2 + k pi */
  criticalTimes(o: Osc, t0: number, t1: number): number[] {
    const out: number[] = [];
    const kMin = Math.ceil((o.B * (t0 - o.C) - Math.PI / 2) / Math.PI) - 1;
    const kMax = Math.floor((o.B * (t1 - o.C) - Math.PI / 2) / Math.PI) + 1;
    for (let k = kMin; k <= kMax; k++) {
      const t = o.C + (Math.PI / 2 + k * Math.PI) / o.B;
      if (t >= t0 - 1e-12 && t <= t1 + 1e-12) out.push(t);
    }
    return out.sort((p, q) => p - q);
  },
  /** Absolute extrema on a closed interval: compare endpoints and critical times (closed interval method). */
  extremaOn(o: Osc, t0: number, t1: number) {
    const cands = [t0, ...this.criticalTimes(o, t0, t1), t1].map((t) => ({ t, h: osc.h(o, t), endpoint: t === t0 || t === t1 }));
    let max = cands[0], min = cands[0];
    for (const c of cands) { if (c.h > max.h + 1e-12) max = c; if (c.h < min.h - 1e-12) min = c; }
    return { max, min, candidates: cands };
  },
};
