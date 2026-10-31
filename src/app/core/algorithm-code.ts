import type { AlgorithmTracePhase } from './algorithm-trace';
import type { StrategyId } from './strategy-runner';

/** One display line from the synchronized TypeScript explanation panel. */
export interface AlgorithmCodeLine {
  readonly number: number;
  readonly code: string;
  readonly phases: readonly AlgorithmTracePhase[];
  readonly indent: number;
}

/** Compact code excerpt and short conceptual description for one strategy. */
export interface AlgorithmCodeSnippet {
  readonly title: string;
  readonly summary: string;
  readonly sourceUrl: string;
  readonly lines: readonly AlgorithmCodeLine[];
}

const line = (
  number: number,
  code: string,
  phases: readonly AlgorithmTracePhase[],
  indent = 0,
): AlgorithmCodeLine => ({ number, code, phases, indent });

const snippets: Readonly<Record<StrategyId, AlgorithmCodeSnippet>> = {
  exhaustive: {
    title: 'Búsqueda exhaustiva',
    summary: 'Recorre cada par no ordenado exactamente una vez.',
    sourceUrl:
      'https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/exhaustive-search.ts',
    lines: [
      line(1, 'let best;', ['initialize']),
      line(2, 'for (let i = 0; i < n - 1; i++) {', ['scan']),
      line(3, 'for (let j = i + 1; j < n; j++) {', ['scan'], 1),
      line(4, 'const [p, q] = [points[i], points[j]];', ['compare'], 2),
      line(5, 'const d = distanceBetween(p, q, counter);', ['compare'], 2),
      line(6, 'if (!best || d < best.distance) {', ['accept'], 2),
      line(7, 'best = { first: p, second: q, distance: d };', ['accept'], 3),
      line(8, '}', ['accept'], 2),
      line(9, '}', ['scan'], 1),
      line(10, '}', ['scan']),
      line(11, 'return best;', ['complete']),
    ],
  },
  'exhaustive-pruning': {
    title: 'Exhaustivo con poda',
    summary: 'Ordena por x y corta cuando la separación horizontal ya no puede mejorar.',
    sourceUrl:
      'https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/exhaustive-search-with-pruning.ts',
    lines: [
      line(1, 'heapSortByX(points);', ['sort-x']),
      line(2, 'let best;', ['initialize']),
      line(3, 'for (let i = 0; i < n - 1; i++) {', ['scan']),
      line(4, 'for (let j = i + 1; j < n; j++) {', ['scan'], 1),
      line(5, 'const [p, q] = [points[i], points[j]];', ['compare'], 2),
      line(6, 'const deltaX = q.x - p.x;', ['prune-horizontal'], 2),
      line(7, 'if (best && deltaX >= best.distance) break;', ['prune-horizontal'], 2),
      line(8, 'const d = distanceBetween(p, q, counter);', ['compare'], 2),
      line(9, 'if (!best || d < best.distance) {', ['accept'], 2),
      line(10, 'best = { first: p, second: q, distance: d };', ['accept'], 3),
      line(11, '}', ['accept'], 2),
      line(12, '}', ['scan'], 1),
      line(13, '}', ['scan']),
      line(14, 'return best;', ['complete']),
    ],
  },
  'divide-conquer': {
    title: 'Divide y vencerás básico',
    summary: 'Resuelve dos mitades y compara candidatos cruzados dentro de la franja.',
    sourceUrl:
      'https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/divide-and-conquer-search.ts',
    lines: [
      line(1, 'heapSortByX(points);', ['sort-x']),
      line(2, 'const size = end - start;', ['initialize']),
      line(3, 'if (size <= 3) {', ['base-case']),
      line(4, 'const d = distanceBetween(p, q, counter);', ['base-case', 'compare'], 1),
      line(5, '}', ['base-case']),
      line(6, 'const mid = start + Math.floor(size / 2);', ['divide']),
      line(7, 'const dividerX = points[mid].x;', ['divide']),
      line(8, 'const left = closestPairInRange(points, start, mid, /* … */);', ['divide']),
      line(9, 'const right = closestPairInRange(points, mid, end, /* … */);', ['divide']),
      line(10, 'let best = left;', ['combine']),
      line(11, 'if (right.distance < left.distance) best = right;', ['combine']),
      line(12, 'const delta = best.distance;', ['combine']),
      line(13, 'const leftStrip = [];', ['build-strip']),
      line(14, 'const rightStrip = [];', ['build-strip']),
      line(15, 'if (dividerX - p.x < delta) leftStrip.push(p);', ['build-strip']),
      line(16, 'for (const p of leftStrip) {', ['compare']),
      line(17, 'for (const q of rightStrip) {', ['compare'], 1),
      line(18, 'if (q.x - p.x >= best.distance) break;', ['prune-horizontal'], 2),
      line(19, 'const d = distanceBetween(p, q, counter);', ['compare'], 2),
      line(20, 'if (d < best.distance) best = candidate;', ['accept'], 2),
      line(21, '}', ['compare'], 1),
      line(22, '}', ['compare']),
      line(23, 'return best;', ['complete']),
    ],
  },
  'divide-conquer-improved': {
    title: 'Divide y vencerás mejorado',
    summary: 'Mantiene órdenes por x e y y revisa como máximo once sucesores de la franja.',
    sourceUrl:
      'https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/divide-and-conquer-improved-search.ts',
    lines: [
      line(1, 'heapSortByX(points);', ['sort-x']),
      line(2, 'const byY = [...points];', ['sort-y']),
      line(3, 'heapSortByY(byY);', ['sort-y']),
      line(4, 'const size = end - start;', ['initialize']),
      line(5, 'if (size <= 3) {', ['base-case']),
      line(6, 'return exhaustiveRange(byX, start, end, counter);', [], 1),
      line(7, '}', []),
      line(8, 'const mid = start + Math.floor(size / 2);', ['divide']),
      line(9, 'const dividerX = byX[mid].x;', ['divide']),
      line(10, 'for (const point of byY) {', []),
      line(11, 'if (xIndex < mid) leftByY.push(point);', [], 1),
      line(12, 'else rightByY.push(point);', [], 1),
      line(13, '}', []),
      line(14, 'const left = closestPairInRange(byX, leftByY, /* … */);', ['divide']),
      line(15, 'const right = closestPairInRange(byX, rightByY, /* … */);', ['divide']),
      line(16, 'let best = left;', ['combine']),
      line(17, 'if (right.distance < left.distance) best = right;', ['combine']),
      line(18, 'const delta = best.distance;', ['combine']),
      line(19, 'const strip = [];', ['build-strip']),
      line(20, 'for (const p of byY) {', []),
      line(21, 'if (Math.abs(p.x - dividerX) < delta) strip.push(p);', [], 1),
      line(22, '}', []),
      line(23, 'for (let i = 0; i < strip.length - 1; i++) {', []),
      line(24, 'const last = Math.min(i + 11, strip.length - 1);', [], 1),
      line(25, 'for (let j = i + 1; j <= last; j++) {', [], 1),
      line(26, 'const [p, q] = [strip[i], strip[j]];', [], 2),
      line(27, 'const deltaY = q.y - p.y;', [], 2),
      line(28, 'if (deltaY >= best.distance) break;', ['prune-vertical'], 2),
      line(29, 'if (sameSide) continue;', [], 2),
      line(30, 'const d = distanceBetween(p, q, counter);', ['compare'], 2),
      line(31, 'if (d < best.distance) best = candidate;', ['accept'], 2),
      line(32, '}', [], 1),
      line(33, '}', []),
      line(34, 'return best;', ['complete']),
    ],
  },
};

/** Returns the synchronized compact code excerpt for a registered strategy. */
export function getAlgorithmCodeSnippet(strategyId: StrategyId): AlgorithmCodeSnippet {
  return snippets[strategyId];
}
