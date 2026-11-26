import type { ClosestPair, DistanceCounter, Point } from './models';
import { heapSortByX, heapSortByY } from './heap-sort';
import { distanceBetween } from './distance';
import type { SearchObserver } from './search-observer';

/**
 * Solves the half-open range `[start, end)` while carrying the same points in
 * `y` order. Keeping both orders is the key invariant that avoids sorting every
 * recursive strip again and preserves the overall $\Theta(n\log n)$ bound.
 */
function closestPairInRange(
  pointsByX: readonly Point[],
  pointsByY: readonly Point[],
  start: number,
  end: number,
  xIndexByPoint: ReadonlyMap<Point, number>,
  counter: DistanceCounter,
  observer?: SearchObserver,
  depth = 0,
): ClosestPair | undefined {
  const size = end - start;

  if (size <= 3) {
    observer?.phase(
      'base-case',
      { activePoints: pointsByX.slice(start, end), depth },
      counter.calculations,
    );

    let best: ClosestPair | undefined = undefined;

    for (let i = start; i < end - 1; i++) {
      for (let j = i + 1; j < end; j++) {
        const distance = distanceBetween(pointsByX[i], pointsByX[j], counter);
        const candidate: ClosestPair = {
          first: pointsByX[i],
          second: pointsByX[j],
          distance,
        };
        observer?.compare(pointsByX[i], pointsByX[j], distance, counter.calculations);

        if (best === undefined || candidate.distance < best.distance) {
          best = candidate;
          observer?.accept(candidate, counter.calculations);
        }
      }
    }

    return best;
  }

  const middle = start + Math.floor(size / 2);
  const dividerX = pointsByX[middle].x;

  observer?.phase(
    'divide',
    { activePoints: pointsByX.slice(start, end), dividerX, depth },
    counter.calculations,
  );

  const leftPointsByY: Point[] = [];
  const rightPointsByY: Point[] = [];

  // A linear stable partition preserves the existing y order in both children.
  for (const point of pointsByY) {
    const xIndex = xIndexByPoint.get(point);

    if (xIndex === undefined) {
      throw new Error('Point is missing from the x-order index');
    }

    // Object identity is safe here because every order contains the same Point objects.
    if (xIndex < middle) {
      leftPointsByY.push(point);
    } else {
      rightPointsByY.push(point);
    }
  }

  const leftBest = closestPairInRange(
    pointsByX,
    leftPointsByY,
    start,
    middle,
    xIndexByPoint,
    counter,
    observer,
    depth + 1,
  );

  const rightBest = closestPairInRange(
    pointsByX,
    rightPointsByY,
    middle,
    end,
    xIndexByPoint,
    counter,
    observer,
    depth + 1,
  );

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
    { activePoints: pointsByX.slice(start, end), dividerX, delta, depth },
    counter.calculations,
  );

  const strip: Point[] = [];

  // Since pointsByY is already sorted, filtering it also leaves the strip sorted by y.
  for (const point of pointsByY) {
    if (Math.abs(point.x - dividerX) < delta) {
      strip.push(point);
    }
  }

  observer?.phase(
    'build-strip',
    { activePoints: strip, dividerX, delta, depth },
    counter.calculations,
  );

  for (let i = 0; i < strip.length - 1; i++) {
    // The geometric packing argument used by the assignment bounds the search
    // to the next eleven points in y order, making strip processing linear.
    const lastSuccessor = Math.min(i + 11, strip.length - 1);

    const firstXIndex = xIndexByPoint.get(strip[i]);

    if (firstXIndex === undefined) {
      throw new Error('Point is missing from the x-order index');
    }

    const firstIsLeft = firstXIndex < middle;

    for (let j = i + 1; j <= lastSuccessor; j++) {
      const deltaY = strip[j].y - strip[i].y;

      if (deltaY >= best.distance) {
        // Later successors have an equal or larger y gap, so none can improve `best`.
        observer?.prune(strip[i], strip[j], 'vertical', counter.calculations);
        break;
      }

      const secondXIndex = xIndexByPoint.get(strip[j]);

      if (secondXIndex === undefined) {
        throw new Error('Point is missing from the x-order index');
      }

      const secondIsLeft = secondXIndex < middle;

      if (firstIsLeft === secondIsLeft) {
        // Same-half pairs were already considered by that recursive result.
        continue;
      }

      const distance = distanceBetween(strip[i], strip[j], counter);
      const candidate: ClosestPair = {
        first: strip[i],
        second: strip[j],
        distance,
      };
      observer?.compare(strip[i], strip[j], distance, counter.calculations);

      if (candidate.distance < best.distance) {
        best = candidate;
        observer?.accept(candidate, counter.calculations);
      }
    }
  }

  return best;
}

/**
 * Finds the closest pair while preserving orders by both `x` and `y`.
 *
 * @remarks The algorithm sorts the received working array by `x`, creates a second
 * view ordered by `y`, partitions that view stably, and examines at most eleven
 * successors per strip point. Time is $\Theta(n\log n)$ for every distribution
 * and auxiliary space is $O(n)$.
 *
 * @param points - Mutable working copy of the dataset.
 * @param counter - Distance instrumentation for this execution.
 * @param observer - Optional hooks used only when generating a visual trace.
 * @returns The closest pair, or `undefined` when fewer than two points exist.
 */
export function divideAndConquerImprovedSearch(
  points: Point[],
  counter: DistanceCounter,
  observer?: SearchObserver,
): ClosestPair | undefined {
  observer?.phase('sort-x', { activePoints: points, depth: 0 }, counter.calculations);
  heapSortByX(points);

  // The index map lets the y-ordered view identify each point's recursive half
  // in O(1), instead of repeatedly searching the x-ordered array.
  const xIndexByPoint = new Map<Point, number>();

  for (let index = 0; index < points.length; index++) {
    xIndexByPoint.set(points[index], index);
  }

  const pointsByY = [...points];
  observer?.phase('sort-y', { activePoints: pointsByY, depth: 0 }, counter.calculations);
  heapSortByY(pointsByY);
  observer?.phase('initialize', { activePoints: points, depth: 0 }, counter.calculations);

  return closestPairInRange(points, pointsByY, 0, points.length, xIndexByPoint, counter, observer);
}
