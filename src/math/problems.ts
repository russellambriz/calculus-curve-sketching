import type { Question } from '../components/Question';
import type { Concept } from '../state/progress';

export type Rng = () => number;
export function mulberry(seed: number): Rng {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const nz = (r: Rng, lo: number, hi: number) => { let v = 0; while (v === 0) v = int(r, lo, hi); return v; };
const term = (c: number, pow: string, first = false) => { if (c === 0) return ''; const s = c < 0 ? '-' : first ? '' : '+'; const m = Math.abs(c); return `${s}${m === 1 && pow ? '' : m}${pow}`; };
const poly = (cs: [number, string][]) => { let out = '', first = true; for (const [c, p] of cs) { const t = term(c, p, first); if (t) { out += t; first = false; } } return out || '0'; };

/** Each generator returns a question whose answer is computed exactly from the generated parameters. */
export const GENERATORS: Record<Concept, (r: Rng, level: number) => Question> = {
  derivative(r, level) {
    if (level < 3) {
      const a = nz(r, -4, 4), b = int(r, -6, 6), c = int(r, -5, 5), x0 = int(r, -3, 3), deg = level === 1 ? 2 : 3;
      const ans = deg === 2 ? 2 * a * x0 + b : 3 * a * x0 * x0 + 2 * b * x0 + c;
      const f = deg === 2 ? poly([[a, 'x^2'], [b, 'x'], [c, '']]) : poly([[a, 'x^3'], [b, 'x^2'], [c, 'x']]);
      return { id: 'g', concept: 'derivative', kind: 'number', answer: ans, tol: 1e-6, prompt: `Let $f(x)=${f}$. Find $f'(${x0})$.`,
        plain: 'Bring each exponent down in front and lower it by one (x³ → 3x², x² → 2x, x → 1, constants → 0). Then plug in the number.', formal: 'Power rule: (xⁿ)′ = n xⁿ⁻¹, and differentiation is linear.' };
    }
    const k = nz(r, 1, 3), x0 = int(r, 0, 2);
    return { id: 'g', concept: 'derivative', kind: 'number', answer: (2 * x0 + k * x0 * x0) * Math.exp(k * x0), tol: 0.005,
      prompt: `Let $f(x)=x^2e^{${k}x}$. Find $f'(${x0})$ (to 2 decimals).`, plain: 'Two things multiplied together, so use "first′·second + first·second′". The derivative of e^{kx} is k·e^{kx}.', formal: `Product rule + chain rule: f′ = 2x e^{${k}x} + ${k}x² e^{${k}x}.` };
  },
  critical(r, level) {
    const p = int(r, -4, 3), q = p + int(r, 1, 4), k = nz(r, -2, 2);
    if (level >= 3 && r() < 0.5) return { id: 'g', concept: 'critical', kind: 'list', answer: [0], prompt: `Find all critical numbers of $f(x)=x^{2/3}$ (enter "none" if none).`,
      plain: 'f′(x) = (2/3)x^{−1/3} is never 0, BUT it is undefined at x = 0 while f(0) = 0 exists. Points where the slope doesn\'t exist count too.', formal: 'c is critical if f(c) is defined and f′(c)=0 or f′(c) DNE.' };
    // f' = 3k(x-p)(x-q) => f = k(x^3 - 1.5(p+q)x^2 + 3pq x)
    const f = poly([[k, 'x^3'], [-1.5 * k * (p + q), 'x^2'], [3 * k * p * q, 'x']]);
    return { id: 'g', concept: 'critical', kind: 'list', answer: [p, q], tol: 1e-6, prompt: `Find all critical numbers of $f(x)=${f}$.`,
      plain: 'Find where the slope is zero: take f′, set it equal to 0, and solve. Factor out the common number first to make it easier.', formal: `f′(x) = ${3 * k}(x² − ${p + q}x + ${p * q}) = ${3 * k}(x − ${p})(x − ${q}).` };
  },
  firstTest(r, level) {
    const a = int(r, -3, 3); const m = level === 1 ? 1 : int(r, 1, 2); const sgnLead = r() < 0.5 || level === 1 ? 1 : -1;
    const ans = m === 2 ? 'neither' : sgnLead > 0 ? 'local min' : 'local max';
    const fp = `${sgnLead < 0 ? '-' : ''}(x ${a < 0 ? '+' : '-'} ${Math.abs(a)})${m === 2 ? '^2' : ''}`;
    return { id: 'g', concept: 'firstTest', kind: 'choice', choices: ['local max', 'local min', 'neither'], answer: ans,
      prompt: `Suppose $f'(x)=${fp}\\,(x^2+1)$. At $x=${a}$, f has a…`,
      plain: m === 2 ? 'A squared factor is never negative, so f′ keeps the SAME sign on both sides — the graph just flattens and keeps going.' : 'Check the sign of f′ just left and just right of the point. Uphill-then-downhill is a peak; downhill-then-uphill is a valley.',
      formal: 'First Derivative Test: extremum only if f′ changes sign. (x²+1) > 0 always, so only the other factor matters.' };
  },
  secondTest(r, level) {
    const c = int(r, -3, 3), v = level >= 2 && r() < 0.35 ? 0 : nz(r, -6, 6);
    return { id: 'g', concept: 'secondTest', kind: 'choice', choices: ['local max', 'local min', 'inconclusive'], answer: v === 0 ? 'inconclusive' : v > 0 ? 'local min' : 'local max',
      prompt: `$f'(${c})=0$ and $f''(${c})=${v}$. What does the second derivative test conclude at $x=${c}$?`,
      plain: v === 0 ? 'When f″ = 0 the curve could be a min (x⁴), a max (−x⁴) or neither (x³). The test gives no answer — go back to the first derivative test.' : 'Positive f″ = cup shape ∪, so a flat spot at the bottom of a cup is a minimum. Negative = cap ∩ = maximum.',
      formal: 'f″(c)>0 ⇒ local min; f″(c)<0 ⇒ local max; f″(c)=0 ⇒ inconclusive.' };
  },
  concavity(r) {
    const a = nz(r, -3, 3), b = int(r, -6, 6), x0 = int(r, -3, 3);
    const f2 = 6 * a * x0 + 2 * b;
    return { id: 'g', concept: 'concavity', kind: 'choice', choices: ['concave up', 'concave down', 'neither (f″=0)'], answer: f2 > 0 ? 'concave up' : f2 < 0 ? 'concave down' : 'neither (f″=0)',
      prompt: `$f(x)=${poly([[a, 'x^3'], [b, 'x^2'], [int(r, -5, 5), 'x']])}$. At $x=${x0}$ is f concave up or down?`,
      plain: 'Concavity is about the SECOND derivative, not the first. Differentiate twice, plug in, and look at the sign.', formal: `f″(x) = ${6 * a}x + ${2 * b}; f″(${x0}) = ${f2}.` };
  },
  inflection(r, level) {
    if (level >= 2 && r() < 0.4) { const c = nz(r, -5, 5); return { id: 'g', concept: 'inflection', kind: 'list', answer: [], prompt: `Find the x-coordinates of all inflection points of $f(x)=x^4${c > 0 ? '+' : ''}${c}x$ (or "none").`,
      plain: 'f″ = 12x² is zero at 0, but it is positive on both sides — the curve stays cup-shaped. No switch, no inflection.', formal: 'Inflection requires a sign change in f″; f″(c)=0 alone is not sufficient.' }; }
    const a = nz(r, -2, 2), p = int(r, -3, 3); // f = a x^3 - 3 a p x^2 + ... => f'' = 6a(x - p)
    return { id: 'g', concept: 'inflection', kind: 'list', answer: [p], tol: 1e-6, prompt: `Find the inflection point(s) of $f(x)=${poly([[a, 'x^3'], [-3 * a * p, 'x^2'], [int(r, -4, 4), 'x']])}$ (x-values).`,
      plain: 'Differentiate twice, set f″ = 0, and check that f″ really switches sign there.', formal: `f″(x) = ${6 * a}x ${-6 * a * p >= 0 ? '+' : '−'} ${Math.abs(6 * a * p)} = ${6 * a}(x − (${p})).` };
  },
  optimization(r, level) {
    if (level === 1 || r() < 0.4) { const P = 40 * int(r, 2, 20); return { id: 'g', concept: 'optimization', kind: 'number', answer: (P * P) / 8, tol: 1e-6,
      prompt: `A rectangular field borders a river (no fence on that side). With ${P} m of fence, what is the maximum area (m²)?`,
      plain: 'Write the area using ONE variable: if the two side pieces are x, the long side is P − 2x. Area = x(P − 2x). Its slope is zero at the top.', formal: 'A(x) = Px − 2x², A′ = P − 4x = 0 ⇒ x = P/4, A = P²/8.' }; }
    if (r() < 0.5) { const x = int(r, 1, 6), V = (x * x * x) / 2; return { id: 'g', concept: 'optimization', kind: 'number', answer: x, tol: 1e-6,
      prompt: `An open-top box with a square base must hold ${V} cm³. What base side minimizes the material used (cm)?`,
      plain: 'Use the volume to get height in terms of base (h = V/x²), substitute into surface area, then find where its slope is 0.', formal: 'S = x² + 4V/x, S′ = 2x − 4V/x² = 0 ⇒ x = ∛(2V).' }; }
    const x = int(r, 1, 6), S = 3 * x * x; return { id: 'g', concept: 'optimization', kind: 'number', answer: x, tol: 1e-6,
      prompt: `An open-top square-base box is made from ${S} cm² of material. What base side maximizes the volume (cm)?`,
      plain: 'Solve the material equation for h, put it into V = x²h, then set V′ = 0.', formal: 'V = (Sx − x³)/4, V′ = (S − 3x²)/4 = 0 ⇒ x = √(S/3).' };
  },
  motion(r, level) {
    const A = int(r, 1, 5), D = int(r, A, A + 6), k = int(r, 1, 4);
    const kind = level === 1 ? 0 : int(r, 0, 2);
    if (kind === 0) return { id: 'g', concept: 'motion', kind: 'number', answer: D + A, tol: 1e-6, prompt: `$h(t)=${A}\\sin(${k}t)+${D}$. What is the maximum height?`,
      plain: 'sin never goes above 1, so the most you can get is A·1 + D.', formal: 'Range of A sin(·)+D is [D−|A|, D+|A|].' };
    if (kind === 1) return { id: 'g', concept: 'motion', kind: 'number', answer: (2 * Math.PI) / k, tol: 0.01, prompt: `$h(t)=${A}\\sin(${k}t)+${D}$. What is the period (seconds, 2 decimals or as an expression like 2*pi/3)?`,
      plain: 'One full cycle happens when the inside, Bt, grows by 2π. So t grows by 2π/B.', formal: 'Period = 2π/|B|.' };
    return { id: 'g', concept: 'motion', kind: 'number', answer: A * k * Math.cos(k * 1), tol: 0.01, prompt: `$h(t)=${A}\\sin(${k}t)+${D}$. Find the velocity $v(1)$ (2 decimals, radians).`,
      plain: 'Velocity is the derivative of position. The derivative of sin(kt) is k·cos(kt) (chain rule), and the constant D disappears.', formal: `v(t) = ${A * k}cos(${k}t).` };
  },
  domain(r) {
    if (r() < 0.5) { const c = nz(r, -5, 5); return { id: 'g', concept: 'domain', kind: 'number', answer: c, tol: 1e-6, prompt: `$f(x)=\\ln(x ${c < 0 ? '+' : '-'} ${Math.abs(c)})$ is defined for x > ?`,
      plain: 'You can only take ln of a positive number, so the inside must be > 0.', formal: `x − (${c}) > 0 ⇒ x > ${c}; vertical asymptote x = ${c}.` }; }
    const c = nz(r, -5, 5), b = nz(r, -4, 4); return { id: 'g', concept: 'domain', kind: 'number', answer: c, tol: 1e-6, prompt: `$f(x)=\\dfrac{x ${b < 0 ? '-' : '+'} ${Math.abs(b) === Math.abs(c) ? Math.abs(b) + 1 : Math.abs(b)}}{x ${c < 0 ? '+' : '-'} ${Math.abs(c)}}$ has a vertical asymptote at x = ?`,
      plain: 'Look for the x that makes the bottom zero (while the top isn\'t zero there). Dividing by something tiny makes the value huge.', formal: 'Vertical asymptote where the denominator → 0 and the numerator ≠ 0.' };
  },
};
