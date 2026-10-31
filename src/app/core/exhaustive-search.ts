import type { Point, DistanceCounter, ClosestPair } from './models';
import { distanceBetween } from './distance';
import type { SearchObserver } from './search-observer';

/**
 * Finds the closest pair by evaluating every unordered pair once.
 *
 * @remarks Performs exactly `n(n - 1) / 2` distance calculations and runs in
 * $\Theta(n^2)$ time for every point distribution.
 *
 * @param points - Points to search without reordering them.
 * @param counter - Distance instrumentation for this execution.
 * @param observer - Optional hooks used only when generating a visual trace.
 * @returns The closest pair, or `undefined` when fewer than two points exist.
 */
export function exhaustiveSearch(
  points: readonly Point[],
  counter: DistanceCounter,
  observer?: SearchObserver,
): ClosestPair | undefined {
  observer?.phase('initialize', { activePoints: points }, counter.calculations);
  observer?.phase('scan', { activePoints: points }, counter.calculations);

  let best: undefined | ClosestPair = undefined;
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance: number = distanceBetween(points[i], points[j], counter);
      const candidate: ClosestPair = { first: points[i], second: points[j], distance };
      observer?.compare(points[i], points[j], distance, counter.calculations);

      if (best === undefined || candidate.distance < best.distance) {
        best = candidate;
        observer?.accept(candidate, counter.calculations);
      }
    }
  }
  return best;
}
