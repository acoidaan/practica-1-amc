import type { ClosestPair, Point } from './models';

/** Reason why a candidate can be discarded without evaluating its Euclidean distance. */
export type PruneReason = 'horizontal' | 'vertical';

/** Algorithm phase used to synchronize the trace with explanatory pseudocode. */
export type SearchPhase =
  'initialize' | 'sort-x' | 'sort-y' | 'scan' | 'divide' | 'base-case' | 'combine' | 'build-strip';

/** Spatial context attached to a structural algorithm phase. */
export interface SearchPhaseContext {
  readonly activePoints?: readonly Point[];
  readonly dividerX?: number;
  readonly delta?: number;
  readonly depth?: number;
}

/**
 * Optional observation hooks used to explain an execution without changing its result.
 *
 * @remarks Production measurements do not pass an observer, so event generation,
 * timers and rendering remain outside the measured algorithm boundary.
 */
export interface SearchObserver {
  /** Reports a structural phase such as sorting, dividing or building the strip. */
  phase(phase: SearchPhase, context: SearchPhaseContext, distanceCalculations: number): void;
  /** Reports one Euclidean distance that has just been evaluated. */
  compare(first: Point, second: Point, distance: number, distanceCalculations: number): void;
  /** Reports a candidate accepted as the best pair in the current search context. */
  accept(pair: ClosestPair, distanceCalculations: number): void;
  /** Reports a pair that proves the remaining candidates can be pruned. */
  prune(first: Point, second: Point, reason: PruneReason, distanceCalculations: number): void;
}
