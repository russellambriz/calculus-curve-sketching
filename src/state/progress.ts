import { useSyncExternalStore } from 'react';

export type Concept = 'derivative' | 'critical' | 'firstTest' | 'secondTest' | 'concavity' | 'inflection' | 'optimization' | 'motion' | 'domain';
export const CONCEPTS: Record<Concept, string> = {
  derivative: 'Computing derivatives', critical: 'Critical numbers', firstTest: 'First derivative test',
  secondTest: 'Second derivative test', concavity: 'Concavity', inflection: 'Inflection points',
  optimization: 'Optimization', motion: 'Motion (h, v, a)', domain: 'Domain & asymptotes',
};
export interface ConceptStat { attempts: number; correct: number; level: number; streak: number; lastMistake?: string }
export interface Progress {
  visited: Record<string, number>;
  concepts: Partial<Record<Concept, ConceptStat>>;
  lessons: Record<string, { step: number; done: boolean }>;
  predictions: { made: number; close: number };
  sketches: Record<string, number>; // best score per exercise
}
const KEY = 'calc-lab-progress-v1';
const empty = (): Progress => ({ visited: {}, concepts: {}, lessons: {}, predictions: { made: 0, close: 0 }, sketches: {} });

function load(): Progress {
  try { const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null; return raw ? { ...empty(), ...JSON.parse(raw) } : empty(); }
  catch { return empty(); }
}
let state = load();
const subs = new Set<() => void>();
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ } subs.forEach((s) => s()); }

export const progress = {
  get: () => state,
  update(fn: (p: Progress) => Progress) { state = fn(structuredClone(state)); save(); },
  reset() { state = empty(); save(); },
  record(c: Concept, ok: boolean, mistake?: string) {
    progress.update((p) => {
      const s = p.concepts[c] ?? { attempts: 0, correct: 0, level: 1, streak: 0 };
      s.attempts++;
      if (ok) { s.correct++; s.streak++; if (s.streak >= 2) { s.level = Math.min(3, s.level + 1); s.streak = 0; } }
      else { s.streak = 0; s.level = Math.max(1, s.level - 1); s.lastMistake = mistake; }
      p.concepts[c] = s; return p;
    });
  },
  visit(id: string) { progress.update((p) => { p.visited[id] = (p.visited[id] ?? 0) + 1; return p; }); },
};
export function useProgress(): Progress {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => state, () => state);
}
/** Lower = weaker. Unseen concepts count as moderately weak so they get introduced. */
export function weakness(s?: ConceptStat) { if (!s || s.attempts === 0) return 0.5; return (s.correct + 1) / (s.attempts + 2); }
