import type { ClosestPair, DistanceCounter, Point } from './models';
import { copyPoints } from './point-copy';
import type {
  PruneReason,
  SearchObserver,
  SearchPhase,
  SearchPhaseContext,
} from './search-observer';
import { STRATEGIES, type StrategyId } from './strategy-runner';

/** Maximum dataset size accepted by the animated visualizer. */
export const MAX_VISUALIZATION_POINTS = 120;

/** Semantic phase used by the code panel and the geometric overlays. */
export type AlgorithmTracePhase =
  SearchPhase | 'compare' | 'accept' | 'prune-horizontal' | 'prune-vertical' | 'complete';

/** Event types shown by the animated execution player. */
export type AlgorithmTraceStepType = 'phase' | 'comparison' | 'best' | 'prune' | 'complete';

/** One replayable state transition emitted by a closest-pair strategy. */
export interface AlgorithmTraceStep {
  readonly type: AlgorithmTraceStepType;
  readonly phase: AlgorithmTracePhase;
  readonly first: Point | undefined;
  readonly second: Point | undefined;
  readonly candidateDistance: number | undefined;
  readonly bestPair: ClosestPair | undefined;
  readonly distanceCalculations: number;
  readonly pruneReason: PruneReason | undefined;
  readonly activePoints: readonly Point[];
  readonly dividerX: number | undefined;
  readonly delta: number | undefined;
  readonly depth: number | undefined;
}

/** Complete trace and final result for one strategy execution. */
export interface AlgorithmTrace {
  readonly strategyId: StrategyId;
  readonly strategyName: string;
  readonly steps: readonly AlgorithmTraceStep[];
  readonly result: ClosestPair;
  readonly distanceCalculations: number;
}

function contextStep(
  type: AlgorithmTraceStepType,
  phase: AlgorithmTracePhase,
  context: SearchPhaseContext,
  distanceCalculations: number,
  bestPair: ClosestPair | undefined,
): AlgorithmTraceStep {
  return {
    type,
    phase,
    first: undefined,
    second: undefined,
    candidateDistance: undefined,
    bestPair,
    distanceCalculations,
    pruneReason: undefined,
    activePoints: context.activePoints ?? [],
    dividerX: context.dividerX,
    delta: context.delta,
    depth: context.depth,
  };
}

/**
 * Executes a real strategy with observation enabled and records a replayable trace.
 *
 * @remarks The trace is intentionally separate from `measureStrategy`: generating and
 * replaying visual events must never contaminate the experimental timing boundary.
 *
 * @throws `RangeError` when the dataset has fewer than two points or exceeds the
 * visualizer safety limit.
 */
export function createAlgorithmTrace(
  strategyId: StrategyId,
  points: readonly Point[],
): AlgorithmTrace {
  if (points.length < 2) {
    throw new RangeError('At least two points are required to create a trace');
  }

  if (points.length > MAX_VISUALIZATION_POINTS) {
    throw new RangeError(`The visualizer accepts at most ${MAX_VISUALIZATION_POINTS} points`);
  }

  const definition = STRATEGIES.find((strategy) => strategy.id === strategyId);

  if (definition === undefined) {
    throw new Error(`Unknown strategy: ${strategyId}`);
  }

  const steps: AlgorithmTraceStep[] = [];
  let globalBest: ClosestPair | undefined = undefined;
  let currentContext: SearchPhaseContext = { activePoints: points, depth: 0 };

  const observer: SearchObserver = {
    phase(phase, context, distanceCalculations): void {
      currentContext = context;
      steps.push(contextStep('phase', phase, context, distanceCalculations, globalBest));
    },
    compare(first, second, distance, distanceCalculations): void {
      steps.push({
        ...contextStep('comparison', 'compare', currentContext, distanceCalculations, globalBest),
        first,
        second,
        candidateDistance: distance,
      });
    },
    accept(pair, distanceCalculations): void {
      if (globalBest !== undefined && pair.distance >= globalBest.distance) return;

      globalBest = pair;
      steps.push({
        ...contextStep('best', 'accept', currentContext, distanceCalculations, pair),
        first: pair.first,
        second: pair.second,
        candidateDistance: pair.distance,
      });
    },
    prune(first, second, reason, distanceCalculations): void {
      steps.push({
        ...contextStep(
          'prune',
          reason === 'vertical' ? 'prune-vertical' : 'prune-horizontal',
          currentContext,
          distanceCalculations,
          globalBest,
        ),
        first,
        second,
        pruneReason: reason,
      });
    },
  };

  const workPoints = copyPoints(points);
  const counter: DistanceCounter = { calculations: 0 };
  const result = definition.search(workPoints, counter, observer);

  if (result === undefined) {
    throw new Error(`${definition.name} did not return a closest pair`);
  }

  steps.push({
    ...contextStep(
      'complete',
      'complete',
      { activePoints: points, depth: 0 },
      counter.calculations,
      result,
    ),
    first: result.first,
    second: result.second,
    candidateDistance: result.distance,
  });

  return {
    strategyId,
    strategyName: definition.name,
    steps,
    result,
    distanceCalculations: counter.calculations,
  };
}
