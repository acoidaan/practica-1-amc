import type { Point } from './models';
import type { Clock, MeasuredStrategy, StrategyDefinition } from './strategy-runner';
import { measureStrategy, measureStrategyBatch } from './strategy-runner';

/** Target duration accumulated by a batch of very fast executions. */
export const TARGET_MEASUREMENT_MILLISECONDS = 5;
/** Safety limit that bounds both runtime and prepared working copies. */
export const MAX_MEASUREMENT_BATCH_SIZE = 100;
const MINIMUM_CALIBRATION_MILLISECONDS = 0.05;

/** Measures strategies with a cached batch size for each strategy and input size. */
export type AdaptiveStrategyMeasurer = (
  definition: StrategyDefinition,
  points: readonly Point[],
  now: Clock,
) => MeasuredStrategy;

function chooseBatchSize(elapsedMilliseconds: number): number {
  if (!Number.isFinite(elapsedMilliseconds) || elapsedMilliseconds < 0) {
    throw new Error('Calibration time must be finite and non-negative');
  }

  if (elapsedMilliseconds >= TARGET_MEASUREMENT_MILLISECONDS) return 1;

  const effectiveElapsed = Math.max(elapsedMilliseconds, MINIMUM_CALIBRATION_MILLISECONDS);

  return Math.min(
    MAX_MEASUREMENT_BATCH_SIZE,
    Math.max(2, Math.ceil(TARGET_MEASUREMENT_MILLISECONDS / effectiveElapsed)),
  );
}

/**
 * Creates an isolated adaptive measurer for one complete experiment run.
 *
 * @remarks The first call for each strategy and size performs excluded warm-up and
 * calibration executions. Later repetitions reuse the selected batch size.
 */
export function createAdaptiveStrategyMeasurer(): AdaptiveStrategyMeasurer {
  const batchSizes = new Map<string, number>();

  return (definition, points, now) => {
    const key = `${definition.id}:${points.length}`;
    let batchSize = batchSizes.get(key);

    if (batchSize === undefined) {
      measureStrategy(definition, points, now);
      const calibration = measureStrategy(definition, points, now);
      batchSize = chooseBatchSize(calibration.result.elapsedMilliseconds);
      batchSizes.set(key, batchSize);
    }

    return measureStrategyBatch(definition, points, now, batchSize);
  };
}
