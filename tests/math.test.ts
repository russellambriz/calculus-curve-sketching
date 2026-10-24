import { describe, it, expect } from 'vitest';
import { buildFunction, realPow } from '../src/math/expr';
import { analyze } from '../src/math/analysis';
import { field, boxFixedVolume, boxFixedSurface, osc } from '../src/math/optimization';

const A = (e: string, a: number, b: number) => { const B = buildFunction(e); return analyze(B.f, B.d1, B.d2, a, b); };
const near = (v: number, t: number, eps = 1e-4) => expect(Math.abs(v - t)).toBeLessThan(eps);

describe('symbolic derivatives', () => {
  const cases: [string, number, number, number][] = [
    ['x^3 - 3x', 2, 9, 12], ['sin(x)', 0, 1, 0], ['exp(2x)', 0, 2, 4], ['log(x)', 2, 0.5, -0.25],
    ['x^2 * exp(x)', 1, 3 * Math.E, 7 * Math.E], ['1/(x-1)', 2, -1, 2], ['cos(3x)', 0, 0, -9], ['sqrt(x)', 4, 0.25, -1 / 32],
  ];
  for (const [e, x, d1, d2] of cases) it(`${e} at x=${x}`, () => {
    const B = buildFunction(e); expect(B.symbolic).toBe(true); near(B.d1(x), d1); near(B.d2(x), d2);
  });
  it('real powers of negative numbers', () => { near(realPow(-8, 1 / 3), -2); near(realPow(-8, 2 / 3), 4); expect(Number.isNaN(realPow(-4, 0.5))).toBe(true); });
  it('x^(2/3) defined for negative x', () => { near(buildFunction('x^(2/3)').f(-8), 4); });
  it('derivative undefined at |x| corner', () => { expect(Number.isNaN(buildFunction('abs(x)').d1(0))).toBe(true); });
  it('reports parse errors', () => { expect(buildFunction('x +* 2').error).toBeTruthy(); });
});

describe('critical point classification', () => {
  it('x^3-3x: max at -1, min at 1, inflection at 0', () => {
    const r = A('x^3 - 3x', -3, 3);
    expect(r.criticals.map((c) => [c.x, c.kind])).toEqual([[-1, 'local max'], [1, 'local min']]);
    expect(r.criticals[0].secondTest).toBe('local max');
    expect(r.inflections.filter((i) => i.isInflection).map((i) => i.x)).toEqual([0]);
  });
  it("x^3: f'(0)=0 but no extremum", () => {
    const r = A('x^3', -2, 2.3);
    expect(r.criticals).toHaveLength(1); near(r.criticals[0].x, 0); expect(r.criticals[0].kind).toBe('neither');
    expect(r.criticals[0].secondTest).toBe('inconclusive');
    expect(r.monotonic.every((i) => i.sign === 1)).toBe(true);
  });
  it("x^4: f''(0)=0 but no inflection; min at 0", () => {
    const r = A('x^4', -2, 2.1);
    expect(r.criticals[0].kind).toBe('local min');
    const c = r.inflections.find((i) => Math.abs(i.x) < 1e-3)!;
    expect(c).toBeTruthy(); expect(c.isInflection).toBe(false);
    expect(r.concavity.every((i) => i.sign >= 0)).toBe(true);
  });
  it('|x|: undefined derivative gives min', () => {
    for (const [a, b] of [[-2, 2], [-2, 2.3]]) {
      const r = A('abs(x)', a, b);
      expect(r.criticals).toHaveLength(1); near(r.criticals[0].x, 0, 1e-3);
      expect(r.criticals[0].reason).toBe("f' undefined"); expect(r.criticals[0].kind).toBe('local min');
    }
  });
  it('x^(2/3): cusp is a critical number (min)', () => {
    const r = A('x^(2/3)', -2, 2.7);
    expect(r.criticals).toHaveLength(1); near(r.criticals[0].x, 0, 1e-3);
    expect(r.criticals[0].reason).toBe("f' undefined"); expect(r.criticals[0].kind).toBe('local min');
  });
  it('x^(1/3): vertical tangent, critical but not extremum', () => {
    const r = A('x^(1/3)', -2, 2.7);
    expect(r.criticals).toHaveLength(1); expect(r.criticals[0].kind).toBe('neither');
  });
  it('boundary extrema on closed interval: x^2 on [-1,2]', () => {
    const r = A('x^2', -1, 2);
    expect(r.absMax).toEqual({ x: 2, y: 4 }); near(r.absMin!.x, 0);
    expect(r.endpoints.find((e) => e.x === 2)!.kind).toBe('local max');
    expect(r.endpoints.find((e) => e.x === -1)!.kind).toBe('local max');
  });
  it('boundary extrema when no critical points: e^x on [0,1]', () => {
    const r = A('exp(x)', 0, 1);
    expect(r.criticals).toHaveLength(0); expect(r.absMin!.x).toBe(0); expect(r.absMax!.x).toBe(1);
  });
  it('rational: vertical asymptote is not a critical number', () => {
    const r = A('1/(x-1)', -3, 4);
    expect(r.discontinuities).toHaveLength(1); near(r.discontinuities[0].x, 1, 1e-3);
    expect(r.discontinuities[0].type).toBe('vertical asymptote');
    expect(r.criticals).toHaveLength(0); expect(r.absMax).toBeUndefined();
    expect(r.monotonic.every((i) => i.sign === -1)).toBe(true);
  });
  it('rational x/(x^2-4)... asymptotes at ±2', () => {
    const r = A('x/(x^2-4)', -5, 5.3);
    expect(r.discontinuities.map((d) => Math.round(d.x))).toEqual([-2, 2]);
  });
  it('(x^2+1)/x: max at -1, min at 1, asymptote at 0', () => {
    const r = A('(x^2+1)/x', -4, 4.1);
    expect(r.criticals.map((c) => [Math.round(c.x * 1e4) / 1e4, c.kind])).toEqual([[-1, 'local max'], [1, 'local min']]);
  });
  it('jump discontinuity detection (sign)', () => {
    const r = A('sign(x) + x', -1, 1.3);
    expect(r.discontinuities.length).toBe(1); expect(r.discontinuities[0].type).toBe('jump/removable');
  });
  it('log domain restriction', () => {
    const r = A('x*log(x)', -1, 3);
    expect(r.undefinedRegions.length).toBe(1);
    near(r.criticals[0].x, 1 / Math.E); expect(r.criticals[0].kind).toBe('local min');
  });
  it('trig: sin on [0, 2pi]', () => {
    const r = A('sin(x)', 0, 2 * Math.PI);
    near(r.criticals[0].x, Math.PI / 2); near(r.criticals[1].x, 3 * Math.PI / 2);
    expect(r.inflections.filter((i) => i.isInflection).length).toBe(1);
  });
  it('exp(-x^2): inflections at ±1/sqrt2', () => {
    const r = A('exp(-x^2)', -3, 3);
    const xs = r.inflections.filter((i) => i.isInflection).map((i) => i.x);
    near(xs[0], -Math.SQRT1_2); near(xs[1], Math.SQRT1_2);
  });
});

describe('optimization constraints', () => {
  it('river field keeps 2x+L=P and maximizes at P/4', () => {
    for (const P of [100, 240, 1000]) {
      for (const x of [1, P / 8, P / 3]) near(2 * x + field.length(P, x), P);
      near(field.dArea(P, field.optimalX(P)), 0); near(field.area(P, field.optimalX(P)), field.maxArea(P));
      expect(field.area(P, field.optimalX(P) + 1)).toBeLessThan(field.maxArea(P));
    }
  });
  it('box fixed volume: V preserved; SA min at cbrt(2V), h=x/2', () => {
    const V = 32;
    for (const x of [1, 2.5, 6]) near(x * x * boxFixedVolume.height(V, x), V);
    const x = boxFixedVolume.optimalX(V); near(x, 4); near(boxFixedVolume.height(V, x), 2);
    near(boxFixedVolume.dSurface(V, x), 0); expect(boxFixedVolume.d2Surface(V, x)).toBeGreaterThan(0);
    near(boxFixedVolume.surface(V, x), 48);
  });
  it('box fixed surface: S preserved; V max at sqrt(S/3)', () => {
    const S = 108;
    for (const x of [1, 4, 9]) { const h = boxFixedSurface.height(S, x); near(x * x + 4 * x * h, S); }
    const x = boxFixedSurface.optimalX(S); near(x, 6); near(boxFixedSurface.height(S, x), 3);
    near(boxFixedSurface.volume(S, x), 108); near(boxFixedSurface.dVolume(S, x), 0);
    expect(boxFixedSurface.d2Volume(S, x)).toBeLessThan(0);
  });
  it('oscillation derivatives and restricted-interval extrema with endpoints', () => {
    const o = { A: 2, B: Math.PI, C: 0, D: 5 };
    near(osc.period(o), 2);
    near(osc.v(o, 0.3), (osc.h(o, 0.3 + 1e-6) - osc.h(o, 0.3 - 1e-6)) / 2e-6, 1e-5);
    near(osc.a(o, 0.3), (osc.v(o, 0.3 + 1e-6) - osc.v(o, 0.3 - 1e-6)) / 2e-6, 1e-4);
    expect(osc.criticalTimes(o, 0, 2).map((t) => +t.toFixed(6))).toEqual([0.5, 1.5]);
    const e = osc.extremaOn(o, 0, 0.3); // no critical time inside -> both at endpoints
    expect(e.max.t).toBe(0.3); expect(e.min.t).toBe(0); expect(e.max.endpoint && e.min.endpoint).toBe(true);
    const e2 = osc.extremaOn(o, 0, 1.2); near(e2.max.t, 0.5); near(e2.max.h, 7); expect(e2.min.t).toBe(1.2);
  });
});

describe('degenerate cases', () => {
  it('constant (removable-hole rational) has no critical numbers', () => {
    const r = A('(x - 1)/(x - 1)', -6, 6);
    expect(r.criticals).toHaveLength(0);
  });
  it('linear function has no inflection points', () => { expect(A('2x+1', -3, 3).inflections).toHaveLength(0); });
});
