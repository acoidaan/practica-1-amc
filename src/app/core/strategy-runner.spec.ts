import type { Point } from './models';
import type { StrategyDefinition } from './strategy-runner';
import { measureStrategy, measureStrategyBatch } from './strategy-runner';

const points: readonly Point[] = [
  { id: 1, x: 0, y: 0 },
  { id: 2, x: 3, y: 4 },
];

describe('measureStrategy', () => {
  it('copies the points, measures the search and returns its instrumented result', () => {
    const definition: StrategyDefinition = {
      id: 'exhaustive',
      name: 'Test strategy',
      outputFileName: 'test.tsp',
      usesOriginalSourceText: false,
      search: (workPoints, counter) => {
        workPoints.reverse();
        counter.calculations = 7;

        return {
          first: workPoints[0],
          second: workPoints[1],
          distance: 5,
        };
      },
    };
    const readings = [10, 14.5];
    let readingIndex = 0;

    const measured = measureStrategy(definition, points, () => readings[readingIndex++]);

    expect(points.map((point) => point.id)).toEqual([1, 2]);
    expect(measured.workPoints.map((point) => point.id)).toEqual([2, 1]);
    expect(measured.workPoints).not.toBe(points);
    expect(measured.result.closestPair.distance).toBe(5);
    expect(measured.result.distanceCalculations).toBe(7);
    expect(measured.result.elapsedMilliseconds).toBe(4.5);
    expect(readingIndex).toBe(2);
  });

  it('measures a batch as an average while copying before the clock starts', () => {
    let searchCalls = 0;
    const definition: StrategyDefinition = {
      id: 'exhaustive',
      name: 'Batch strategy',
      outputFileName: 'batch.tsp',
      usesOriginalSourceText: false,
      search: (workPoints, counter) => {
        searchCalls++;
        workPoints.reverse();
        counter.calculations = 6;

        return {
          first: workPoints[0],
          second: workPoints[1],
          distance: 5,
        };
      },
    };
    const readings = [10, 15];
    let readingIndex = 0;

    const measured = measureStrategyBatch(definition, points, () => readings[readingIndex++], 2);

    expect(searchCalls).toBe(2);
    expect(readingIndex).toBe(2);
    expect(points.map(({ id }) => id)).toEqual([1, 2]);
    expect(measured.workPoints.map(({ id }) => id)).toEqual([2, 1]);
    expect(measured.result.elapsedMilliseconds).toBe(2.5);
    expect(measured.result.distanceCalculations).toBe(6);
    expect(measured.measurementBatchSize).toBe(2);
  });

  it('rejects a strategy that does not find a pair', () => {
    const definition: StrategyDefinition = {
      id: 'exhaustive',
      name: 'Empty strategy',
      outputFileName: 'empty.tsp',
      usesOriginalSourceText: false,
      search: () => undefined,
    };

    expect(() => measureStrategy(definition, points, () => 0)).toThrowError(
      'Empty strategy did not return a closest pair',
    );
  });
});
