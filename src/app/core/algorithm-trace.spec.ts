import { describe, expect, it } from 'vitest';
import { createAlgorithmTrace, MAX_VISUALIZATION_POINTS } from './algorithm-trace';
import type { Point } from './models';
import { STRATEGIES } from './strategy-runner';

const points: readonly Point[] = [
  { id: 1, x: 0, y: 0 },
  { id: 2, x: 3, y: 4 },
  { id: 3, x: 4, y: 4 },
  { id: 4, x: 10, y: 1 },
];

describe('createAlgorithmTrace', () => {
  it('replays every registered strategy and finishes with its correct result', () => {
    for (const strategy of STRATEGIES) {
      const trace = createAlgorithmTrace(strategy.id, points);
      const finalStep = trace.steps.at(-1);
      const comparisonSteps = trace.steps.filter((step) => step.type === 'comparison');

      expect(trace.strategyName).toBe(strategy.name);
      expect(trace.result.distance).toBe(1);
      expect(finalStep?.type).toBe('complete');
      expect(finalStep?.bestPair).toEqual(trace.result);
      expect(comparisonSteps).toHaveLength(trace.distanceCalculations);
    }
  });

  it('keeps the visual best monotonically non-increasing across recursive contexts', () => {
    const trace = createAlgorithmTrace('divide-conquer-improved', points);
    const bestDistances = trace.steps
      .map((step) => step.bestPair?.distance)
      .filter((distance): distance is number => distance !== undefined);

    for (let index = 1; index < bestDistances.length; index++) {
      expect(bestDistances[index]).toBeLessThanOrEqual(bestDistances[index - 1]);
    }
  });

  it('records recursive divisions, strips and depth for divide-and-conquer', () => {
    const recursivePoints: Point[] = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      x: index * 3,
      y: (index * 7) % 11,
    }));
    const trace = createAlgorithmTrace('divide-conquer-improved', recursivePoints);
    const division = trace.steps.find((step) => step.phase === 'divide');
    const strip = trace.steps.find((step) => step.phase === 'build-strip');

    expect(division?.dividerX).toBeDefined();
    expect(division?.activePoints).toHaveLength(8);
    expect(trace.steps.some((step) => (step.depth ?? 0) > 0)).toBe(true);
    expect(strip?.delta).toBeGreaterThan(0);
    expect(strip?.activePoints.length).toBeGreaterThan(0);
  });

  it('records horizontal pruning without counting it as a Euclidean distance', () => {
    const trace = createAlgorithmTrace('exhaustive-pruning', points);
    const pruneStep = trace.steps.find((step) => step.type === 'prune');

    expect(pruneStep?.pruneReason).toBe('horizontal');
    expect(trace.steps.filter((step) => step.type === 'comparison')).toHaveLength(
      trace.distanceCalculations,
    );
  });

  it('rejects datasets that would generate an unsafe trace', () => {
    const oversized: Point[] = Array.from({ length: MAX_VISUALIZATION_POINTS + 1 }, (_, index) => ({
      id: index + 1,
      x: index,
      y: index,
    }));

    expect(() => createAlgorithmTrace('exhaustive', oversized)).toThrow(RangeError);
  });
});
