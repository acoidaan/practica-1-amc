import type { ClosestPair, DistanceCounter, Point } from './models';
import { heapSortByX } from './heap-sort';
import { distanceBetween } from './distance';
import type { SearchObserver } from './search-observer';

/**
 * Finds the closest pair after sorting by `x` and pruning with horizontal distance.
 *
 * @remarks The function sorts `points` in place. Its favourable expected cost is
 * $\Theta(n\log n)$, including HeapSort, while a vertical dataset degrades to
 * $\Theta(n^2)$ because every horizontal difference is zero.
 *
 * @param points - Mutable working copy of the dataset.
 * @param counter - Distance instrumentation for this execution.
 * @param observer - Optional hooks used only when generating a visual trace.
 * @returns The closest pair, or `undefined` when fewer than two points exist.
 */
export function exhaustiveSearchWithPruning(
  points: Point[],
  counter: DistanceCounter,
  observer?: SearchObserver,
): ClosestPair | undefined {
  observer?.phase('sort-x', { activePoints: points }, counter.calculations);
  heapSortByX(points);
  observer?.phase('initialize', { activePoints: points }, counter.calculations);
  observer?.phase('scan', { activePoints: points }, counter.calculations);

  let best: ClosestPair | undefined = undefined;

  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 1 + i; j < points.length; j++) {
      const deltaX = points[j].x - points[i].x;

      if (best !== undefined && deltaX >= best.distance) {
        observer?.prune(points[i], points[j], 'horizontal', counter.calculations);
        break;
      }

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
