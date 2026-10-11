import type { Point } from './models';
import type { StrategyDefinition } from './strategy-runner';
import {
  createAdaptiveStrategyMeasurer,
  MAX_MEASUREMENT_BATCH_SIZE,
} from './adaptive-strategy-measurer';

const points: readonly Point[] = [
  { id: 1, x: 0, y: 0 },
  { id: 2, x: 1, y: 0 },
];

function createDefinition(onSearch: () => void): StrategyDefinition {
  return {
    id: 'exhaustive',
    name: 'Test strategy',
    outputFileName: 'test.tsp',
    usesOriginalSourceText: false,
    search: (workPoints, counter) => {
      onSearch();
      counter.calculations = 1;

      return {
        first: workPoints[0],
        second: workPoints[1],
        distance: 1,
      };
    },
  };
}

describe('createAdaptiveStrategyMeasurer', () => {
  it('uses the maximum batch after a zero-duration calibration', () => {
    let searchCalls = 0;
    const definition = createDefinition(() => searchCalls++);
    const readings = [0, 1, 2, 2, 10, 15];
    let readingIndex = 0;
    const measure = createAdaptiveStrategyMeasurer();

    const measured = measure(definition, points, () => readings[readingIndex++]);

    expect(measured.measurementBatchSize).toBe(MAX_MEASUREMENT_BATCH_SIZE);
    expect(measured.result.elapsedMilliseconds).toBe(0.05);
    expect(measured.result.distanceCalculations).toBe(1);
    expect(searchCalls).toBe(MAX_MEASUREMENT_BATCH_SIZE + 2);
  });

  it('uses one measured execution when calibration already reaches the target', () => {
    let searchCalls = 0;
    const definition = createDefinition(() => searchCalls++);
    const readings = [0, 6, 10, 16, 20, 26];
    let readingIndex = 0;
    const measure = createAdaptiveStrategyMeasurer();

    const measured = measure(definition, points, () => readings[readingIndex++]);

    expect(measured.measurementBatchSize).toBe(1);
    expect(measured.result.elapsedMilliseconds).toBe(6);
    expect(searchCalls).toBe(3);
  });

  it('reuses the calibrated batch for the same strategy and size', () => {
    let searchCalls = 0;
    const definition = createDefinition(() => searchCalls++);
    const readings = [0, 1, 2, 3, 10, 15, 20, 25];
    let readingIndex = 0;
    const measure = createAdaptiveStrategyMeasurer();

    const first = measure(definition, points, () => readings[readingIndex++]);
    const second = measure(definition, points, () => readings[readingIndex++]);

    expect(first.measurementBatchSize).toBe(5);
    expect(second.measurementBatchSize).toBe(5);
    expect(searchCalls).toBe(12);
    expect(readingIndex).toBe(8);
  });
});
