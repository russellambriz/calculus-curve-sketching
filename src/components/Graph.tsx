import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Fn } from '../math/expr';

export interface Curve { fn: Fn; color: string; width?: number; dash?: string; label?: string; clipTo?: number }
export interface Pt { x: number; y: number; color: string; r?: number; label?: string; hollow?: boolean }
export interface Seg { x1: number; y1: number; x2: number; y2: number; color: string; width?: number; dash?: string }
export interface Band { a: number; b: number; color: string }
export interface Poly { pts: [number, number][]; color: string; width?: number }

export interface GraphProps {
  x: [number, number];
  y: [number, number];
  height?: number;
  curves?: Curve[];
  points?: Pt[];
  segments?: Seg[];
  bands?: Band[];
  vlines?: { x: number; color: string; dash?: string }[];
  polylines?: Poly[];
  title?: ReactNode;
  xLabel?: string;
  /** Called with x as the user drags / taps / uses arrow keys. */
  onDragX?: (x: number) => void;
  dragX?: number;
  step?: number;
  /** freehand drawing: receives the stroke in graph coords */
  onDraw?: (pts: [number, number][], phase: 'start' | 'move' | 'end') => void;
  onClick?: (x: number, y: number) => void;
  ariaLabel?: string;
  children?: ReactNode;
}

function niceStep(span: number) {
  const raw = span / 8, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

/** Interactive SVG graph. Pointer Events => mouse, pen and touch; arrow keys => keyboard dragging. */
export function Graph(props: GraphProps) {
  const { x: [x0, x1], y: [y0, y1], height = 220 } = props;
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(Math.max(200, e[0].contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const H = height, pad = { l: 34, r: 8, t: 8, b: 18 };
  const sx = (x: number) => pad.l + ((x - x0) / (x1 - x0)) * (w - pad.l - pad.r);
  const sy = (y: number) => pad.t + ((y1 - y) / (y1 - y0)) * (H - pad.t - pad.b);
  const ix = (px: number) => x0 + ((px - pad.l) / (w - pad.l - pad.r)) * (x1 - x0);
  const iy = (py: number) => y1 - ((py - pad.t) / (H - pad.t - pad.b)) * (y1 - y0);
  const dragging = useRef(false);

  const paths = useMemo(() => (props.curves ?? []).map((c) => {
    const N = Math.min(900, Math.round(w * 1.2));
    const span = y1 - y0;
    let d = '', pen = false, prev = NaN;
    const xmax = c.clipTo ?? x1;
    for (let i = 0; i <= N; i++) {
      const x = x0 + ((x1 - x0) * i) / N;
      if (x > xmax) break;
      const y = c.fn(x);
      if (!Number.isFinite(y) || (Number.isFinite(prev) && Math.abs(y - prev) > span * 3 && Math.sign(y) !== Math.sign(prev)) || (Number.isFinite(prev) && Math.abs(y - prev) > span * 8)) {
        pen = false; prev = y; if (!Number.isFinite(y)) continue;
      }
      const yc = Math.max(y0 - span * 2, Math.min(y1 + span * 2, y));
      d += `${pen ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(yc).toFixed(1)}`;
      pen = true; prev = y;
    }
    return d;
  }), [props.curves, w, x0, x1, y0, y1]);

  const local = (e: React.PointerEvent) => {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const stroke = useRef<[number, number][]>([]);
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const [px, py] = local(e);
    if (props.onDragX || props.onDraw) { (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId); dragging.current = true; }
    if (props.onDragX) props.onDragX(clampX(ix(px)));
    if (props.onDraw) { stroke.current = [[ix(px), iy(py)]]; props.onDraw(stroke.current, 'start'); }
    if (props.onClick) props.onClick(ix(px), iy(py));
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const [px, py] = local(e);
    if (props.onDragX) props.onDragX(clampX(ix(px)));
    if (props.onDraw) { stroke.current = [...stroke.current, [ix(px), iy(py)]]; props.onDraw(stroke.current, 'move'); }
  };
  const onUp = () => { if (dragging.current && props.onDraw) props.onDraw(stroke.current, 'end'); dragging.current = false; };
  const clampX = (x: number) => Math.max(x0, Math.min(x1, x));
  const onKey = (e: React.KeyboardEvent) => {
    if (!props.onDragX || props.dragX === undefined) return;
    const st = (props.step ?? (x1 - x0) / 200) * (e.shiftKey ? 10 : 1);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { props.onDragX(clampX(props.dragX + st)); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { props.onDragX(clampX(props.dragX - st)); e.preventDefault(); }
    if (e.key === 'Home') props.onDragX(x0);
    if (e.key === 'End') props.onDragX(x1);
  };

  const xs = niceStep(x1 - x0), ys = niceStep(y1 - y0);
  const ticksX: number[] = [], ticksY: number[] = [];
  for (let t = Math.ceil(x0 / xs) * xs; t <= x1 + 1e-9; t += xs) ticksX.push(+t.toFixed(10));
  for (let t = Math.ceil(y0 / ys) * ys; t <= y1 + 1e-9; t += ys) ticksY.push(+t.toFixed(10));
  const interactive = !!(props.onDragX || props.onDraw || props.onClick);

  return (
    <div className="graph" ref={ref}>
      {props.title && <div className="graph-title">{props.title}</div>}
      <svg width={w} height={H} style={{ touchAction: interactive ? 'none' : 'auto', cursor: interactive ? 'crosshair' : 'default' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        tabIndex={props.onDragX ? 0 : -1} onKeyDown={onKey} role={props.onDragX ? 'slider' : 'img'}
        aria-label={props.ariaLabel ?? 'graph'} aria-valuenow={props.dragX}>
        <defs><clipPath id={`clip-${w}-${H}`}><rect x={pad.l} y={pad.t} width={w - pad.l - pad.r} height={H - pad.t - pad.b} /></clipPath></defs>
        {(props.bands ?? []).map((b, i) => (
          <rect key={i} x={sx(Math.max(b.a, x0))} y={pad.t} width={Math.max(0, sx(Math.min(b.b, x1)) - sx(Math.max(b.a, x0)))} height={H - pad.t - pad.b} fill={b.color} />
        ))}
        {ticksX.map((t) => <line key={'gx' + t} x1={sx(t)} x2={sx(t)} y1={pad.t} y2={H - pad.b} className="grid" />)}
        {ticksY.map((t) => <line key={'gy' + t} y1={sy(t)} y2={sy(t)} x1={pad.l} x2={w - pad.r} className="grid" />)}
        {y0 < 0 && y1 > 0 && <line x1={pad.l} x2={w - pad.r} y1={sy(0)} y2={sy(0)} className="axis" />}
        {x0 < 0 && x1 > 0 && <line y1={pad.t} y2={H - pad.b} x1={sx(0)} x2={sx(0)} className="axis" />}
        {ticksX.map((t) => <text key={'tx' + t} x={sx(t)} y={H - 4} className="tick" textAnchor="middle">{+t.toPrecision(4)}</text>)}
        {ticksY.map((t) => <text key={'ty' + t} x={pad.l - 3} y={sy(t) + 3} className="tick" textAnchor="end">{+t.toPrecision(4)}</text>)}
        <g clipPath={`url(#clip-${w}-${H})`}>
          {(props.vlines ?? []).map((v, i) => <line key={i} x1={sx(v.x)} x2={sx(v.x)} y1={pad.t} y2={H - pad.b} stroke={v.color} strokeDasharray={v.dash ?? '4 4'} />)}
          {(props.curves ?? []).map((c, i) => <path key={i} d={paths[i]} fill="none" stroke={c.color} strokeWidth={c.width ?? 2.2} strokeDasharray={c.dash} />)}
          {(props.polylines ?? []).map((p, i) => <polyline key={i} points={p.pts.map(([a, b]) => `${sx(a)},${sy(b)}`).join(' ')} fill="none" stroke={p.color} strokeWidth={p.width ?? 3} strokeLinejoin="round" strokeLinecap="round" />)}
          {(props.segments ?? []).map((s, i) => <line key={i} x1={sx(s.x1)} y1={sy(s.y1)} x2={sx(s.x2)} y2={sy(s.y2)} stroke={s.color} strokeWidth={s.width ?? 2} strokeDasharray={s.dash} />)}
          {(props.points ?? []).filter((p) => Number.isFinite(p.y)).map((p, i) => (
            <g key={i}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r={p.r ?? 5} fill={p.hollow ? 'var(--bg)' : p.color} stroke={p.color} strokeWidth={2} />
              {p.label && <text x={sx(p.x) + 7} y={sy(p.y) - 7} className="pt-label" fill={p.color}>{p.label}</text>}
            </g>
          ))}
        </g>
      </svg>
      {props.children}
    </div>
  );
}

/** Choose a y-window from samples (robust to asymptotes via percentiles). */
export function autoY(fns: Fn[], x: [number, number], padFrac = 0.12): [number, number] {
  const v: number[] = [];
  for (const f of fns) for (let i = 0; i <= 300; i++) { const y = f(x[0] + ((x[1] - x[0]) * i) / 300); if (Number.isFinite(y)) v.push(y); }
  if (!v.length) return [-5, 5];
  v.sort((a, b) => a - b);
  let lo = v[Math.floor(v.length * 0.03)], hi = v[Math.ceil(v.length * 0.97) - 1];
  if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
  const p = (hi - lo) * padFrac;
  return [Math.min(lo - p, 0 - p * 0.2), Math.max(hi + p, p * 0.2)];
}
