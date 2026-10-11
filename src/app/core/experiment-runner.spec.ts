import type { Point } from './models';
import type {
  ExperimentConfig,
  ExperimentDependencies,
  ExperimentProgress,
} from './experiment-runner';
import { runExperiments } from './experiment-runner';

const config: ExperimentConfig = {
  sizes: [2, 3],
  repetitions: 2,
  sameX: true,
  strategyIds: ['exhaustive', 'divide-conquer-improved'],
};

describe('runExperiments', () => {
  it('uses one dataset per repetition and calculates per-strategy averages', () => {
    const generatedDatasets: (readonly Point[])[] = [];
    const measuredDatasets: (readonly Point[])[] = [];
    const progressUpdates: ExperimentProgress[] = [];
    let measureCallIndex = 0;

    const dependencies: ExperimentDependencies = {
      generatePoints: (size, sameX) => {
        expect(sameX).toBe(true);

        const datasetNumber = generatedDatasets.length + 1;
        const points = Array.from({ length: size }, (_, index) => ({
          id: index + 1,
          x: sameX ? 1 : index,
          y: datasetNumber * 10 + index,
        }));

        generatedDatasets.push(points);
        return points;
      },
      measureStrategy: (definition, points) => {
        const datasetIndex = Math.floor(measureCallIndex / config.strategyIds.length);
        const strategyIndex = measureCallIndex % config.strategyIds.length;
        const datasetNumber = datasetIndex + 1;

        expect(points).toBe(generatedDatasets[datasetIndex]);
        measuredDatasets.push(points);
        measureCallIndex++;

        return {
          definition,
          workPoints: [...points],
          result: {
            closestPair: {
              first: points[0],
              second: points[1],
              distance: datasetNumber,
            },
            elapsedMilliseconds: datasetNumber * 10 + strategyIndex,
            distanceCalculations: datasetNumber * 100 + strategyIndex,
          },
        };
      },
      now: () => 0,
    };

    const result = runExperiments(
      config,
      (progress) => progressUpdates.push(progress),
      dependencies,
    );

    expect(generatedDatasets).toHaveLength(4);
    expect(measuredDatasets).toHaveLength(8);
    expect(result.rows).toEqual([
      {
        size: 2,
        strategies: [
          {
            id: 'exhaustive',
            name: 'Exhaustivo',
            averageElapsedMilliseconds: 15,
            averageDistanceCalculations: 150,
            measurementBatchSize: 1,
          },
          {
            id: 'divide-conquer-improved',
            name: 'DyV Mejorado',
            averageElapsedMilliseconds: 16,
            averageDistanceCalculations: 151,
            measurementBatchSize: 1,
          },
        ],
      },
      {
        size: 3,
        strategies: [
          {
            id: 'exhaustive',
            name: 'Exhaustivo',
            averageElapsedMilliseconds: 35,
            averageDistanceCalculations: 350,
            measurementBatchSize: 1,
          },
          {
            id: 'divide-conquer-improved',
            name: 'DyV Mejorado',
            averageElapsedMilliseconds: 36,
            averageDistanceCalculations: 351,
            measurementBatchSize: 1,
          },
        ],
      },
    ]);
    expect(progressUpdates).toEqual([
      {
        completedExperiments: 1,
        totalExperiments: 4,
        currentSize: 2,
        currentRepetition: 1,
      },
      {
        completedExperiments: 2,
        totalExperiments: 4,
        currentSize: 2,
        currentRepetition: 2,
      },
      {
        completedExperiments: 3,
        totalExperiments: 4,
        currentSize: 3,
        currentRepetition: 1,
      },
      {
        completedExperiments: 4,
        totalExperiments: 4,
        currentSize: 3,
        currentRepetition: 2,
      },
    ]);
  });

  it('rejects invalid configurations before generating datasets', () => {
    const generatePoints = vi.fn<ExperimentDependencies['generatePoints']>();
    const dependencies: ExperimentDependencies = {
      generatePoints,
      measureStrategy: vi.fn<ExperimentDependencies['measureStrategy']>(),
      now: () => 0,
    };

    expect(() => runExperiments({ ...config, sizes: [] }, undefined, dependencies)).toThrowError(
      'At least one experiment size is required',
    );
    expect(() => runExperiments({ ...config, sizes: [1] }, undefined, dependencies)).toThrowError(
      'Experiment sizes must be integers greater than or equal to two',
    );
    expect(() =>
      runExperiments({ ...config, repetitions: 0 }, undefined, dependencies),
    ).toThrowError('Repetitions must be a positive integer');
    expect(() =>
      runExperiments({ ...config, strategyIds: [] }, undefined, dependencies),
    ).toThrowError('At least one strategy is required');
    expect(() =>
      runExperiments(
        { ...config, strategyIds: ['exhaustive', 'exhaustive'] },
        undefined,
        dependencies,
      ),
    ).toThrowError('Strategy identifiers must not be repeated');
    expect(generatePoints).not.toHaveBeenCalled();
  });

  it('stops when two strategies return different minimum distances', () => {
    let measureCallIndex = 0;
    const reportProgress = vi.fn();
    const dependencies: ExperimentDependencies = {
      generatePoints: () => [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 1, y: 0 },
      ],
      measureStrategy: (definition, points) => ({
        definition,
        workPoints: [...points],
        result: {
          closestPair: {
            first: points[0],
            second: points[1],
            distance: ++measureCallIndex,
          },
          elapsedMilliseconds: 1,
          distanceCalculations: 1,
        },
      }),
      now: () => 0,
    };

    expect(() =>
      runExperiments({ ...config, sizes: [2], repetitions: 1 }, reportProgress, dependencies),
    ).toThrowError('Strategies returned different distances for size 2, repetition 1');
    expect(reportProgress).not.toHaveBeenCalled();
  });
});
