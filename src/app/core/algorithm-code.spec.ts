import { describe, expect, it } from 'vitest';
import { getAlgorithmCodeSnippet } from './algorithm-code';
import { createAlgorithmTrace } from './algorithm-trace';
import type { Point } from './models';
import { STRATEGIES } from './strategy-runner';

const points: readonly Point[] = [
  { id: 1, x: 0, y: 0 },
  { id: 2, x: 2, y: 7 },
  { id: 3, x: 4, y: 3 },
  { id: 4, x: 6, y: 9 },
  { id: 5, x: 8, y: 2 },
  { id: 6, x: 10, y: 4 },
];

describe('getAlgorithmCodeSnippet', () => {
  it('provides at least one highlighted code line for every emitted trace phase', () => {
    for (const strategy of STRATEGIES) {
      const snippet = getAlgorithmCodeSnippet(strategy.id);
      const trace = createAlgorithmTrace(strategy.id, points);

      expect(snippet.lines.length).toBeGreaterThan(0);
      expect(snippet.sourceUrl).toContain('/src/app/core/');

      for (const step of trace.steps) {
        expect(
          snippet.lines.some((line) => line.phases.includes(step.phase)),
          `${strategy.id} has no code line for phase ${step.phase}`,
        ).toBe(true);
      }
    }
  });

  it('preserves the nested structure of the improved divide-and-conquer excerpt', () => {
    const lines = getAlgorithmCodeSnippet('divide-conquer-improved').lines;
    const indentationByCode = new Map(lines.map((line) => [line.code, line.indent]));

    expect(indentationByCode.get('if (xIndex < mid) leftByY.push(point);')).toBe(1);
    expect(indentationByCode.get('else rightByY.push(point);')).toBe(1);
    expect(indentationByCode.get('const last = Math.min(i + 11, strip.length - 1);')).toBe(1);
    expect(indentationByCode.get('const d = distanceBetween(p, q, counter);')).toBe(2);
    expect(indentationByCode.get('if (d < best.distance) best = candidate;')).toBe(2);
  });
});
