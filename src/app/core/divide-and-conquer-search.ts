import type { ClosestPair, DistanceCounter, Point } from './models';
import { heapSortByX } from './heap-sort';
import { distanceBetween } from './distance';
import type { SearchObserver } from './search-observer';

function closestPairInRange(
  points: readonly Point[],
  start: number,
  end: number,
  counter: DistanceCounter,
  observer?: SearchObserver,
  depth = 0,
): ClosestPair | undefined {
  const size = end - start;

  if (size <= 3) {
    observer?.phase(
      'base-case',
      { activePoints: points.slice(start, end), depth },
      counter.calculations,
    );

    let best: ClosestPair | undefined = undefined;

    for (let i = start; i < end - 1; i++) {
      for (let j = i + 1; j < end; j++) {
        const distance = distanceBetween(points[i], points[j], counter);
        const candidate: ClosestPair = {
          first: points[i],
          second: points[j],
          distance,
        };
        observer?.compare(points[i], points[j], distance, counter.calculations);

        if (best === undefined || candidate.distance < best.distance) {
          best = candidate;
          observer?.accept(candidate, counter.calculations);
        }
      }
    }
    return best;
  }

  const middle = start + Math.floor(size / 2);
  const dividerX = points[middle].x;

  observer?.phase(
    'divide',
    { activePoints: points.slice(start, end), dividerX, depth },
    counter.calculations,
  );

  const leftBest = closestPairInRange(points, start, middle, counter, observer, depth + 1);
  const rightBest = closestPairInRange(points, middle, end, counter, observer, depth + 1);

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

  const delta = best.distance;

  observer?.phase(
    'combine',
    { activePoints: points.slice(start, end), dividerX, delta, depth },
    counter.calculations,
  );

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

  observer?.phase(
    'build-strip',
    { activePoints: [...leftStrip, ...rightStrip], dividerX, delta, depth },
    counter.calculations,
  );

  for (const leftPoint of leftStrip) {
    for (const rightPoint of rightStrip) {
      const deltaX = rightPoint.x - leftPoint.x;

      if (deltaX >= best.distance) {
        observer?.prune(leftPoint, rightPoint, 'horizontal', counter.calculations);
        break;
      }

      const distance = distanceBetween(leftPoint, rightPoint, counter);
      const candidate: ClosestPair = {
        first: leftPoint,
        second: rightPoint,
        distance,
      };
      observer?.compare(leftPoint, rightPoint, distance, counter.calculations);

      if (candidate.distance < best.distance) {
        best = candidate;
        observer?.accept(candidate, counter.calculations);
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
 * @param observer - Optional hooks used only when generating a visual trace.
 * @returns The closest pair, or `undefined` when fewer than two points exist.
 */
export function divideAndConquerSearch(
  points: Point[],
  counter: DistanceCounter,
  observer?: SearchObserver,
): ClosestPair | undefined {
  observer?.phase('sort-x', { activePoints: points, depth: 0 }, counter.calculations);
  heapSortByX(points);
  observer?.phase('initialize', { activePoints: points, depth: 0 }, counter.calculations);

  return closestPairInRange(points, 0, points.length, counter, observer);
}
