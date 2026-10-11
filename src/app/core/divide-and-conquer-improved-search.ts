import type { ClosestPair, DistanceCounter, Point } from './models';
import { heapSortByX, heapSortByY } from './heap-sort';
import { distanceBetween } from './distance';

function closestPairInRange(
  pointsByX: readonly Point[],
  pointsByY: readonly Point[],
  start: number,
  end: number,
  xIndexByPoint: ReadonlyMap<Point, number>,
  counter: DistanceCounter,
): ClosestPair | undefined {
  const size = end - start;

  if (size <= 3) {
    let best: ClosestPair | undefined = undefined;

    for (let i = start; i < end - 1; i++) {
      for (let j = i + 1; j < end; j++) {
        const distance = distanceBetween(pointsByX[i], pointsByX[j], counter);
        const candidate: ClosestPair = {
          first: pointsByX[i],
          second: pointsByX[j],
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
  const leftPointsByY: Point[] = [];
  const rightPointsByY: Point[] = [];

  for (const point of pointsByY) {
    const xIndex = xIndexByPoint.get(point);

    if (xIndex === undefined) {
      throw new Error('Point is missing from the x-order index');
    }

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
  );

  const rightBest = closestPairInRange(
    pointsByX,
    rightPointsByY,
    middle,
    end,
    xIndexByPoint,
    counter,
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

  const dividerX = pointsByX[middle].x;
  const delta = best.distance;
  const strip: Point[] = [];

  for (const point of pointsByY) {
    if (Math.abs(point.x - dividerX) < delta) {
      strip.push(point);
    }
  }

  for (let i = 0; i < strip.length - 1; i++) {
    const lastSuccessor = Math.min(i + 11, strip.length - 1);

    const firstXIndex = xIndexByPoint.get(strip[i]);

    if (firstXIndex === undefined) {
      throw new Error('Point is missing from the x-order index');
    }

    const firstIsLeft = firstXIndex < middle;

    for (let j = i + 1; j <= lastSuccessor; j++) {
      const deltaY = strip[j].y - strip[i].y;

      if (deltaY >= best.distance) {
        break;
      }

      const secondXIndex = xIndexByPoint.get(strip[j]);

      if (secondXIndex === undefined) {
        throw new Error('Point is missing from the x-order index');
      }

      const secondIsLeft = secondXIndex < middle;

      if (firstIsLeft === secondIsLeft) {
        continue;
      }

      const distance = distanceBetween(strip[i], strip[j], counter);
      const candidate: ClosestPair = {
        first: strip[i],
        second: strip[j],
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
 * Finds the closest pair while preserving orders by both `x` and `y`.
 *
 * @remarks The algorithm sorts the received working array by `x`, creates a second
 * view ordered by `y`, partitions that view stably, and examines at most eleven
 * successors per strip point. Time is $\Theta(n\log n)$ for every distribution
 * and auxiliary space is $O(n)$.
 *
 * @param points - Mutable working copy of the dataset.
 * @param counter - Distance instrumentation for this execution.
 * @returns The closest pair, or `undefined` when fewer than two points exist.
 */
export function divideAndConquerImprovedSearch(
  points: Point[],
  counter: DistanceCounter,
): ClosestPair | undefined {
  heapSortByX(points);

  const xIndexByPoint = new Map<Point, number>();

  for (let index = 0; index < points.length; index++) {
    xIndexByPoint.set(points[index], index);
  }

  const pointsByY = [...points];
  heapSortByY(pointsByY);

  return closestPairInRange(points, pointsByY, 0, points.length, xIndexByPoint, counter);
}
