import type { Point } from './models';

/** Compares points by `x`, then `y`, then identifier for a deterministic total order. */
export function comparePointsByX(first: Point, second: Point): number {
  if (first.x !== second.x) {
    return first.x - second.x;
  } else if (first.y !== second.y) {
    return first.y - second.y;
  } else {
    return first.id - second.id;
  }
}

/** Compares points by `y`, then `x`, then identifier for a deterministic total order. */
export function comparePointsByY(first: Point, second: Point): number {
  if (first.y !== second.y) {
    return first.y - second.y;
  } else if (first.x !== second.x) {
    return first.x - second.x;
  } else {
    return first.id - second.id;
  }
}
