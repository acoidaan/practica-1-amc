/**
 * Pure experiment engine that averages equivalent strategy executions.
 *
 * @packageDocumentation
 */

import type { Point } from './models';
import { generatePoints } from './dataset-generator';
import type { Clock, MeasuredStrategy, StrategyDefinition, StrategyId } from './strategy-runner';
import { STRATEGIES } from './strategy-runner';
import { createAdaptiveStrategyMeasurer } from './adaptive-strategy-measurer';

/** Minimum sizes required by the assignment. */
export const REQUIRED_EXPERIMENT_SIZES = [200, 500, 1500, 5000] as const;
/** Default number of independently generated datasets per size. */
export const DEFAULT_EXPERIMENT_REPETITIONS = 10;

/** Serializable configuration sent from Angular to the Web Worker. */
export interface ExperimentConfig {
  readonly sizes: readonly number[];
  readonly repetitions: number;
  readonly sameX: boolean;
  readonly strategyIds: readonly StrategyId[];
}

/** Averaged metrics for one strategy and one dataset size. */
export interface StrategyAverage {
  readonly id: StrategyId;
  readonly name: string;
  readonly averageElapsedMilliseconds: number;
  readonly averageDistanceCalculations: number;
  readonly measurementBatchSize?: number;
}

/** All strategy averages obtained for one dataset size. */
export interface ExperimentRow {
  readonly size: number;
  readonly strategies: readonly StrategyAverage[];
}

/** Complete ordered result returned by an experiment run. */
export interface ExperimentResult {
  readonly rows: readonly ExperimentRow[];
}

/** Progress snapshot emitted after all selected strategies finish one repetition. */
export interface ExperimentProgress {
  readonly completedExperiments: number;
  readonly totalExperiments: number;
  readonly currentSize: number;
  readonly currentRepetition: number;
}

/** Callback used by the Worker to publish progress without coupling the core to the DOM. */
export type ExperimentProgressReporter = (progress: ExperimentProgress) => void;

/** Injectable dataset generator used by production and deterministic tests. */
export type PointGenerator = (size: number, sameX: boolean) => readonly Point[];

/** Injectable strategy measurement boundary. */
export type StrategyMeasurer = (
  definition: StrategyDefinition,
  points: readonly Point[],
  now: Clock,
) => MeasuredStrategy;

/** Replaceable side effects and clocks required by the pure experiment loop. */
export interface ExperimentDependencies {
  readonly generatePoints: PointGenerator;
  readonly measureStrategy: StrategyMeasurer;
  readonly now: Clock;
}

function createDefaultDependencies(): ExperimentDependencies {
  return {
    generatePoints,
    measureStrategy: createAdaptiveStrategyMeasurer(),
    now: () => performance.now(),
  };
}

interface StrategyTotals {
  readonly definition: StrategyDefinition;
  elapsedMilliseconds: number;
  distanceCalculations: number;
  measurementBatchSize: number | undefined;
}

function validateConfig(config: ExperimentConfig): void {
  if (config.sizes.length === 0) {
    throw new Error('At least one experiment size is required');
  }

  if (config.sizes.some((size) => !Number.isInteger(size) || size < 2)) {
    throw new Error('Experiment sizes must be integers greater than or equal to two');
  }

  if (!Number.isInteger(config.repetitions) || config.repetitions <= 0) {
    throw new Error('Repetitions must be a positive integer');
  }

  if (config.strategyIds.length === 0) {
    throw new Error('At least one strategy is required');
  }

  if (new Set(config.strategyIds).size !== config.strategyIds.length) {
    throw new Error('Strategy identifiers must not be repeated');
  }
}

function selectStrategies(strategyIds: readonly StrategyId[]): readonly StrategyDefinition[] {
  return strategyIds.map((strategyId) => {
    const definition = STRATEGIES.find((strategy) => strategy.id === strategyId);

    if (definition === undefined) {
      throw new Error(`Unknown strategy: ${strategyId}`);
    }

    return definition;
  });
}

/**
 * Runs all configured sizes, repetitions and strategies under equivalent conditions.
 *
 * @remarks One dataset is generated per repetition and reused by every selected
 * strategy through independent working copies. A disagreement in minimum distance
 * aborts the experiment instead of averaging invalid results.
 *
 * @param config - Sizes, repetitions, distribution and strategy identifiers.
 * @param reportProgress - Observer called after one complete repetition.
 * @param dependencies - Injectable generator, measurer and clock.
 * @returns Averaged rows ordered like `config.sizes`.
 * @throws `Error` for invalid configuration, unknown strategies or inconsistent distances.
 */
export function runExperiments(
  config: ExperimentConfig,
  reportProgress: ExperimentProgressReporter = () => undefined,
  dependencies: ExperimentDependencies = createDefaultDependencies(),
): ExperimentResult {
  validateConfig(config);

  const definitions = selectStrategies(config.strategyIds);
  const totalExperiments = config.sizes.length * config.repetitions;
  let completedExperiments = 0;
  const rows: ExperimentRow[] = [];

  for (const size of config.sizes) {
    const totals: StrategyTotals[] = definitions.map((definition) => ({
      definition,
      elapsedMilliseconds: 0,
      distanceCalculations: 0,
      measurementBatchSize: undefined,
    }));

    for (let repetition = 1; repetition <= config.repetitions; repetition++) {
      const points = dependencies.generatePoints(size, config.sameX);
      let referenceDistance: number | undefined;

      for (const total of totals) {
        const measured = dependencies.measureStrategy(total.definition, points, dependencies.now);
        const distance = measured.result.closestPair.distance;

        if (referenceDistance === undefined) {
          referenceDistance = distance;
        } else if (distance !== referenceDistance) {
          throw new Error(
            `Strategies returned different distances for size ${size}, repetition ${repetition}`,
          );
        }

        const measurementBatchSize = measured.measurementBatchSize ?? 1;

        if (total.measurementBatchSize === undefined) {
          total.measurementBatchSize = measurementBatchSize;
        } else if (total.measurementBatchSize !== measurementBatchSize) {
          throw new Error(`Measurement batch size changed for strategy ${total.definition.id}`);
        }

        total.elapsedMilliseconds += measured.result.elapsedMilliseconds;
        total.distanceCalculations += measured.result.distanceCalculations;
      }

      completedExperiments++;
      reportProgress({
        completedExperiments,
        totalExperiments,
        currentSize: size,
        currentRepetition: repetition,
      });
    }

    rows.push({
      size,
      strategies: totals.map((total) => ({
        id: total.definition.id,
        name: total.definition.name,
        averageElapsedMilliseconds: total.elapsedMilliseconds / config.repetitions,
        averageDistanceCalculations: total.distanceCalculations / config.repetitions,
        measurementBatchSize: total.measurementBatchSize ?? 1,
      })),
    });
  }

  return { rows };
}
