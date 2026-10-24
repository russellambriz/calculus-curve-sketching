import { describe, it, expect } from 'vitest';
import { GENERATORS, mulberry } from '../src/math/problems';
import { checkAnswer, parseList, parseNum } from '../src/components/Question';
import { buildFunction } from '../src/math/expr';
import { analyze } from '../src/math/analysis';
import { strokeToFn, compareSketch } from '../src/math/sketchCompare';

describe('answer parsing', () => {
  it('parses exact forms', () => { expect(parseNum('pi/4')).toBeCloseTo(Math.PI / 4); expect(parseNum('sqrt(2)')).toBeCloseTo(Math.SQRT2); expect(parseList('none')).toEqual([]); expect(parseList('3, -1')).toEqual([-1, 3]); });
});

describe('mastery generators produce self-consistent problems', () => {
  for (const [name, gen] of Object.entries(GENERATORS)) it(name, () => {
    for (let s = 1; s < 60; s++) for (const lvl of [1, 2, 3]) {
      const q = gen(mulberry(s * 7 + lvl), lvl);
      expect(q.prompt.length).toBeGreaterThan(5);
      if (q.kind === 'choice') expect(q.choices).toContain(q.answer);
      if (q.kind === 'number') expect(Number.isFinite(q.answer as number)).toBe(true);
      const raw = q.kind === 'choice' ? (q.answer as string) : q.kind === 'number' ? String(q.answer) : (q.answer as number[]).join(',') || 'none';
      expect(checkAnswer(q, raw)).toBe(true);
    }
  });
  it('critical-number generator answer matches the analysis engine', () => {
    for (let s = 1; s < 25; s++) {
      const q = GENERATORS.critical(mulberry(s), 1);
      const expr = q.prompt.match(/f\(x\)=(.*)\$/)![1];
      const B = buildFunction(expr);
      const a = analyze(B.f, B.d1, B.d2, -8, 8.3);
      expect(a.criticals.map((c) => Math.round(c.x * 1e4) / 1e4)).toEqual([...(q.answer as number[])].sort((x, y) => x - y));
    }
  });
});

describe('sketch comparison', () => {
  const B = buildFunction('x^3 - 3*x'); const an = analyze(B.f, B.d1, B.d2, -2.5, 2.5);
  const stroke = (g: (x: number) => number) => Array.from({ length: 400 }, (_, i) => { const x = -2.5 + (5 * i) / 399; return [x, g(x)] as [number, number]; });
  it('a perfect sketch scores ~100', () => { const { fn, covered } = strokeToFn(stroke(B.f), -2.5, 2.5); expect(compareSketch(fn, B.f, an, 20, covered).score).toBeGreaterThanOrEqual(95); });
  it('an upside-down sketch scores low with specific feedback', () => {
    const { fn, covered } = strokeToFn(stroke((x) => -B.f(x)), -2.5, 2.5); const r = compareSketch(fn, B.f, an, 20, covered);
    expect(r.score).toBeLessThan(30); expect(r.messages.some((m) => !m.ok && m.text.includes('f′'))).toBe(true);
  });
});

describe('sketch coverage', () => {
  it('a sparse but full-width stroke counts as full coverage', () => {
    const pts = Array.from({ length: 61 }, (_, i) => [-2.5 + (5 * i) / 60, 0] as [number, number]);
    expect(strokeToFn(pts, -2.5, 2.5).covered).toBeGreaterThan(0.95);
  });
  it('half a stroke is half coverage', () => {
    const pts = Array.from({ length: 100 }, (_, i) => [-2.5 + (2.5 * i) / 99, 0] as [number, number]);
    expect(strokeToFn(pts, -2.5, 2.5).covered).toBeLessThan(0.6);
  });
});
