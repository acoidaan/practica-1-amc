import type { Point, DistanceCounter } from './models';

/**
 * Calculates one Euclidean distance and records exactly one instrumented operation.
 *
 * @param first - First endpoint.
 * @param second - Second endpoint.
 * @param counter - Counter owned by the current strategy execution.
 * @returns The Euclidean distance between both points.
 */
export function distanceBetween(first: Point, second: Point, counter: DistanceCounter): number {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

  counter.calculations = counter.calculations + 1;

  return distance;
}
