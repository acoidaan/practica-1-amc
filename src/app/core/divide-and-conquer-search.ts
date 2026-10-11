import type { ClosestPair, DistanceCounter, Point } from './models';
import { heapSortByX } from './heap-sort';
import { distanceBetween } from './distance';

function closestPairInRange(
  points: readonly Point[],
  start: number,
  end: number,
  counter: DistanceCounter,
): ClosestPair | undefined {
  const size = end - start;

  if (size <= 3) {
    let best: ClosestPair | undefined = undefined;

    for (let i = start; i < end - 1; i++) {
      for (let j = i + 1; j < end; j++) {
        const distance = distanceBetween(points[i], points[j], counter);
        const candidate: ClosestPair = {
          first: points[i],
          second: points[j],
          distance,
        };

        if (best === undefined || candidate.distance < best.distance) {
          best = candidate;
        }
      }
    }
    return best;
  }

  const middle = start + Math.floor(size / 2);

  const leftBest = closestPairInRange(points, start, middle, counter);
  const rightBest = closestPairInRange(points, middle, end, counter);

  if (leftBest === undefined) {
    return rightBest;
  }

  if (rightBest === undefined) {
    return leftBest;
  }

  let best = leftBest;

  if (rightBest.distance < leftBest.distance) {
    best = rightBest;
  }

  const dividerX = points[middle].x;
  const delta = best.distance;

  const leftStrip: Point[] = [];
  const rightStrip: Point[] = [];

  for (let i = start; i < middle; i++) {
    if (dividerX - points[i].x < delta) {
      leftStrip.push(points[i]);
    }
  }

  for (let i = middle; i < end; i++) {
    if (points[i].x - dividerX < delta) {
      rightStrip.push(points[i]);
    }
  }

  for (const leftPoint of leftStrip) {
    for (const rightPoint of rightStrip) {
      const deltaX = rightPoint.x - leftPoint.x;

      if (deltaX >= best.distance) {
        break;
      }

      const distance = distanceBetween(leftPoint, rightPoint, counter);
      const candidate: ClosestPair = {
        first: leftPoint,
        second: rightPoint,
        distance,
      };

      if (candidate.distance < best.distance) {
        best = candidate;
      }
    }
  }

  return best;
}

/**
 * Finds the closest pair with the basic divide-and-conquer strategy.
 *
 * @remarks The working array is sorted by `x` in place. Cross-half candidates are
 * pruned only by horizontal separation, so the expected general case is
 * $\Theta(n\log n)$ but the vertical worst case is $\Theta(n^2)$.
 *
 * @param points - Mutable working copy of the dataset.
 * @param counter - Distance instrumentation for this execution.
 * @returns The closest pair, or `undefined` when fewer than two points exist.
 */
export function divideAndConquerSearch(
  points: Point[],
  counter: DistanceCounter,
): ClosestPair | undefined {
  heapSortByX(points);

  return closestPairInRange(points, 0, points.length, counter);
}
