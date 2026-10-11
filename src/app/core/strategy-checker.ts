import type { AlgorithmResult, Dataset } from './models';
import type { Clock, StrategyId } from './strategy-runner';
import { measureStrategy, STRATEGIES } from './strategy-runner';
import { serializeTsplib } from './tsplib-writer';

export type { StrategyId } from './strategy-runner';

function datasetNameFromFileName(fileName: string): string {
  if (fileName.toLowerCase().endsWith('.tsp')) {
    return fileName.slice(0, -4);
  }

  return fileName;
}

/** One measured strategy together with its downloadable TSPLIB output. */
export interface StrategyExecution {
  readonly id: StrategyId;
  readonly name: string;
  readonly outputFileName: string;
  readonly result: AlgorithmResult;
  readonly outputText: string;
}

/** Coordinated result of checking all registered strategies on one dataset. */
export interface StrategyCheckResult {
  readonly executions: readonly StrategyExecution[];
  readonly distancesMatch: boolean;
}

/**
 * Executes every strategy under equivalent initial conditions and compares distances.
 *
 * @param dataset - Active source dataset.
 * @param now - Injectable high-resolution clock; defaults to `performance.now`.
 * @returns Measured executions, export texts and the distance agreement flag.
 * @throws `RangeError` when the dataset contains fewer than two points.
 */
export function checkStrategies(
  dataset: Dataset,
  now: Clock = () => performance.now(),
): StrategyCheckResult {
  if (dataset.points.length < 2) {
    throw new RangeError('At least two points are required to check strategies');
  }

  const measuredStrategies = STRATEGIES.map((definition) =>
    measureStrategy(definition, dataset.points, now),
  );

  const datasetName = datasetNameFromFileName(dataset.fileName);

  const executions = measuredStrategies.map((measured): StrategyExecution => {
    const outputText = measured.definition.usesOriginalSourceText
      ? dataset.sourceText
      : serializeTsplib(datasetName, measured.workPoints);

    return {
      id: measured.definition.id,
      name: measured.definition.name,
      outputFileName: measured.definition.outputFileName,
      result: measured.result,
      outputText,
    };
  });

  const referenceDistance = executions[0].result.closestPair.distance;

  const distancesMatch = executions.every(
    (execution) => execution.result.closestPair.distance === referenceDistance,
  );

  return {
    executions,
    distancesMatch,
  };
}
