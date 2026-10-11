/**
 * Registry and timing boundary shared by all closest-pair strategies.
 *
 * @packageDocumentation
 */

import type { AlgorithmResult, ClosestPair, DistanceCounter, Point } from './models';
import { exhaustiveSearch } from './exhaustive-search';
import { exhaustiveSearchWithPruning } from './exhaustive-search-with-pruning';
import { divideAndConquerSearch } from './divide-and-conquer-search';
import { divideAndConquerImprovedSearch } from './divide-and-conquer-improved-search';
import { copyPoints } from './point-copy';

/** Stable identifiers accepted by the experiment protocol and CSV format. */
export type StrategyId =
  'exhaustive' | 'exhaustive-pruning' | 'divide-conquer' | 'divide-conquer-improved';

/** Common callable contract implemented by each closest-pair algorithm. */
export type SearchStrategy = (points: Point[], counter: DistanceCounter) => ClosestPair | undefined;

/** Injectable clock returning milliseconds. */
export type Clock = () => number;

/** Metadata and implementation associated with one strategy identifier. */
export interface StrategyDefinition {
  readonly id: StrategyId;
  readonly name: string;
  readonly outputFileName: string;
  readonly search: SearchStrategy;
  readonly usesOriginalSourceText: boolean;
}

/** Ordered catalogue used consistently by the interface, Worker and exports. */
export const STRATEGIES: readonly StrategyDefinition[] = [
  {
    id: 'exhaustive',
    name: 'Exhaustivo',
    outputFileName: 'Exhaustivo.tsp',
    search: exhaustiveSearch,
    usesOriginalSourceText: true,
  },
  {
    id: 'exhaustive-pruning',
    name: 'ExhaustivoPoda',
    outputFileName: 'ExhaustivoPoda.tsp',
    search: exhaustiveSearchWithPruning,
    usesOriginalSourceText: false,
  },
  {
    id: 'divide-conquer',
    name: 'DivideVenceras',
    outputFileName: 'DivideVenceras.tsp',
    search: divideAndConquerSearch,
    usesOriginalSourceText: false,
  },
  {
    id: 'divide-conquer-improved',
    name: 'DyV Mejorado',
    outputFileName: 'DyVMejorado.tsp',
    search: divideAndConquerImprovedSearch,
    usesOriginalSourceText: false,
  },
];

/** Complete outcome of one measured strategy, including its reordered working copy. */
export interface MeasuredStrategy {
  readonly definition: StrategyDefinition;
  readonly workPoints: Point[];
  readonly result: AlgorithmResult;
  readonly measurementBatchSize?: number;
}

/**
 * Measures one strategy while keeping preparation of its working copy outside the clock.
 *
 * @param definition - Strategy to execute.
 * @param points - Shared immutable source points.
 * @param now - Clock used for both interval endpoints.
 * @returns The measured result and strategy-owned working array.
 * @throws `Error` when the strategy cannot produce a pair.
 */
export function measureStrategy(
  definition: StrategyDefinition,
  points: readonly Point[],
  now: Clock,
): MeasuredStrategy {
  const workPoints = copyPoints(points);
  const counter: DistanceCounter = { calculations: 0 };

  const start = now();
  const closestPair = definition.search(workPoints, counter);
  const end = now();

  if (closestPair === undefined) {
    throw new Error(`${definition.name} did not return a closest pair`);
  }

  const result: AlgorithmResult = {
    closestPair,
    distanceCalculations: counter.calculations,
    elapsedMilliseconds: end - start,
  };

  return {
    definition,
    workPoints,
    result,
    measurementBatchSize: 1,
  };
}

/**
 * Measures a batch and reports average time and distance calculations per execution.
 *
 * @remarks Every working copy and counter is prepared before the clock starts.
 *
 * @param definition - Strategy to execute repeatedly.
 * @param points - Shared immutable source points.
 * @param now - Clock used for both interval endpoints.
 * @param batchSize - Positive number of executions in the timed batch.
 * @returns Per-execution averages and one representative working array.
 */
export function measureStrategyBatch(
  definition: StrategyDefinition,
  points: readonly Point[],
  now: Clock,
  batchSize: number,
): MeasuredStrategy {
  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error('Measurement batch size must be a positive integer');
  }

  const workPointSets = Array.from({ length: batchSize }, () => copyPoints(points));
  const counters: DistanceCounter[] = Array.from({ length: batchSize }, () => ({
    calculations: 0,
  }));
  const closestPairs: (ClosestPair | undefined)[] = new Array(batchSize);

  const start = now();

  for (let index = 0; index < batchSize; index++) {
    closestPairs[index] = definition.search(workPointSets[index], counters[index]);
  }

  const end = now();
  const closestPair = closestPairs[0];

  if (closestPair === undefined || closestPairs.some((pair) => pair === undefined)) {
    throw new Error(`${definition.name} did not return a closest pair`);
  }

  const totalDistanceCalculations = counters.reduce(
    (total, counter) => total + counter.calculations,
    0,
  );
  const result: AlgorithmResult = {
    closestPair,
    distanceCalculations: totalDistanceCalculations / batchSize,
    elapsedMilliseconds: (end - start) / batchSize,
  };

  return {
    definition,
    workPoints: workPointSets[0],
    result,
    measurementBatchSize: batchSize,
  };
}
