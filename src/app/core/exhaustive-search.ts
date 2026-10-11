import type { Point, DistanceCounter, ClosestPair } from './models';
import { distanceBetween } from './distance';

/**
 * Finds the closest pair by evaluating every unordered pair once.
 *
 * @remarks Performs exactly `n(n - 1) / 2` distance calculations and runs in
 * $\Theta(n^2)$ time for every point distribution.
 *
 * @param points - Points to search without reordering them.
 * @param counter - Distance instrumentation for this execution.
 * @returns The closest pair, or `undefined` when fewer than two points exist.
 */
export function exhaustiveSearch(
  points: readonly Point[],
  counter: DistanceCounter,
): ClosestPair | undefined {
  let best: undefined | ClosestPair = undefined;
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const distance: number = distanceBetween(points[i], points[j], counter);
      const candidate: ClosestPair = { first: points[i], second: points[j], distance };
      if (best === undefined || candidate.distance < best.distance) {
        best = candidate;
      }
    }
  }
  return best;
}
