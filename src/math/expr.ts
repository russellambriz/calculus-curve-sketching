import { parse, derivative, simplify, type MathNode } from 'mathjs';

export type Fn = (x: number) => number;

export interface FnBundle {
  expr: string;
  f: Fn;
  d1: Fn;
  d2: Fn;
  tex: string;
  d1Tex: string;
  d2Tex: string;
  /** true when f', f'' came from symbolic differentiation (mathjs). false => central-difference numeric approximation. */
  symbolic: boolean;
  error?: string;
}

/** Real power: handles negative bases with rational exponents of odd denominator, e.g. x^(2/3), x^(1/3). */
export function realPow(b: number, p: number): number {
  if (b >= 0 || Number.isInteger(p)) return Math.pow(b, p);
  for (let q = 1; q <= 15; q += 2) {
    const n = Math.round(p * q);
    if (Math.abs(n / q - p) < 1e-12) {
      const mag = Math.pow(-b, p);
      return n % 2 === 0 ? mag : -mag;
    }
  }
  return NaN;
}

const FUNCS: Record<string, (...a: number[]) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, sqrt: (x) => (x < 0 ? NaN : Math.sqrt(x)), cbrt: Math.cbrt,
  abs: Math.abs, sign: Math.sign,
  log: (x, b?: number) => (x <= 0 ? NaN : b === undefined ? Math.log(x) : Math.log(x) / Math.log(b)),
  ln: (x) => (x <= 0 ? NaN : Math.log(x)),
  log10: (x) => (x <= 0 ? NaN : Math.log10(x)),
  log2: (x) => (x <= 0 ? NaN : Math.log2(x)),
  nthRoot: (x, n = 2) => realPow(x, 1 / n),
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E, PI: Math.PI, E: Math.E };

type Ev = (x: number) => number;

/** Compile a mathjs tree into a fast real-valued JS function (undefined/complex => NaN). */
export function compileNode(node: MathNode): Ev {
  const n = node as any;
  switch (n.type) {
    case 'ConstantNode': { const v = Number(n.value); return () => v; }
    case 'SymbolNode': {
      if (n.name === 'x' || n.name === 't') return (x) => x;
      if (n.name in CONSTS) { const v = CONSTS[n.name]; return () => v; }
      throw new Error(`Unknown symbol "${n.name}" (use x as the variable)`);
    }
    case 'ParenthesisNode': return compileNode(n.content);
    case 'OperatorNode': {
      const args: Ev[] = n.args.map(compileNode);
      const [a, b] = args;
      switch (n.fn) {
        case 'add': return (x) => a(x) + b(x);
        case 'subtract': return (x) => a(x) - b(x);
        case 'multiply': return (x) => a(x) * b(x);
        case 'divide': return (x) => { const d = b(x); return d === 0 ? NaN : a(x) / d; };
        case 'pow': return (x) => realPow(a(x), b(x));
        case 'unaryMinus': return (x) => -a(x);
        case 'unaryPlus': return a;
        default: throw new Error(`Unsupported operator ${n.op}`);
      }
    }
    case 'FunctionNode': {
      const name = n.fn.name as string;
      const fn = FUNCS[name];
      if (!fn) throw new Error(`Unsupported function ${name}()`);
      const args: Ev[] = n.args.map(compileNode);
      if (args.length === 1) { const a = args[0]; return (x) => fn(a(x)); }
      return (x) => fn(...args.map((g) => g(x)));
    }
    default: throw new Error(`Unsupported expression part (${n.type})`);
  }
}

export function safe(g: Ev): Fn {
  return (x) => { const v = g(x); return Number.isFinite(v) ? v : NaN; };
}

/** Central-difference numeric derivative (clearly labelled "numeric" in the UI). */
export function numericDerivative(f: Fn, h = 1e-5): Fn {
  return (x) => (f(x + h) - f(x - h)) / (2 * h);
}
export function numericSecond(f: Fn, h = 1e-4): Fn {
  return (x) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
}

function tex(node: MathNode): string {
  try { return node.toTex({ parenthesis: 'auto', implicit: 'hide' }); } catch { return node.toString(); }
}

const cache = new Map<string, FnBundle>();

export function buildFunction(expr: string): FnBundle {
  const hit = cache.get(expr);
  if (hit) return hit;
  let out: FnBundle;
  try {
    const node = parse(expr.replace(/\bln\(/g, 'log('));
    const f = safe(compileNode(node));
    try {
      // Evaluate the UNSIMPLIFIED derivative so domain issues (e.g. abs(x)/x at 0) are preserved;
      // display the simplified form.
      const d1n = derivative(node, 'x', { simplify: false });
      const d2n = derivative(d1n, 'x', { simplify: false });
      out = {
        expr, f, d1: safe(compileNode(d1n)), d2: safe(compileNode(d2n)),
        tex: tex(node), d1Tex: tex(simplify(d1n)), d2Tex: tex(simplify(d2n)), symbolic: true,
      };
    } catch {
      out = { expr, f, d1: numericDerivative(f), d2: numericSecond(f), tex: tex(node),
        d1Tex: '\\text{(numeric)}', d2Tex: '\\text{(numeric)}', symbolic: false };
    }
  } catch (e: any) {
    const nan = () => NaN;
    out = { expr, f: nan, d1: nan, d2: nan, tex: '', d1Tex: '', d2Tex: '', symbolic: false, error: e?.message ?? String(e) };
  }
  cache.set(expr, out);
  return out;
}

export function fmt(v: number, d = 3): string {
  if (!Number.isFinite(v)) return 'undefined';
  if (Math.abs(v) < 1e-10) return '0';
  const r = Number(v.toFixed(d));
  return String(r);
}
