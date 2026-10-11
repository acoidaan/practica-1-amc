import type { ClosestPair, DistanceCounter, Point } from './models';
import { heapSortByX } from './heap-sort';
import { distanceBetween } from './distance';

/**
 * Finds the closest pair after sorting by `x` and pruning with horizontal distance.
 *
 * @remarks The function sorts `points` in place. Its favourable expected cost is
 * $\Theta(n\log n)$, including HeapSort, while a vertical dataset degrades to
 * $\Theta(n^2)$ because every horizontal difference is zero.
 *
 * @param points - Mutable working copy of the dataset.
 * @param counter - Distance instrumentation for this execution.
 * @returns The closest pair, or `undefined` when fewer than two points exist.
 */
export function exhaustiveSearchWithPruning(
  points: Point[],
  counter: DistanceCounter,
): ClosestPair | undefined {
  heapSortByX(points);
  let best: ClosestPair | undefined = undefined;

  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 1 + i; j < points.length; j++) {
      const deltaX = points[j].x - points[i].x;

      if (best !== undefined && deltaX >= best.distance) {
        break;
      }

      const distance: number = distanceBetween(points[i], points[j], counter);
      const candidate: ClosestPair = { first: points[i], second: points[j], distance };

      if (best === undefined || candidate.distance < best.distance) {
        best = candidate;
      }
    }
  }
  return best;
}
