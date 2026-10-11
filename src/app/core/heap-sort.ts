import type { Point } from './models';
import { comparePointsByX, comparePointsByY } from './point-order';

type PointComparator = (first: Point, second: Point) => number;

function swap(points: Point[], firstIndex: number, secondIndex: number): void {
  [points[firstIndex], points[secondIndex]] = [points[secondIndex], points[firstIndex]];
}

function siftDown(
  points: Point[],
  rootIndex: number,
  heapSize: number,
  comparator: PointComparator,
): void {
  let current = rootIndex;

  while (true) {
    let largest = current;
    const left = 2 * current + 1;
    const right = 2 * current + 2;

    if (left < heapSize && comparator(points[left], points[largest]) > 0) {
      largest = left;
    }

    if (right < heapSize && comparator(points[right], points[largest]) > 0) {
      largest = right;
    }

    if (largest === current) {
      return;
    }
    swap(points, current, largest);
    current = largest;
  }
}

function heapSort(points: Point[], comparator: PointComparator): void {
  for (let root = Math.floor(points.length / 2) - 1; root >= 0; root--) {
    siftDown(points, root, points.length, comparator);
  }

  for (let end = points.length - 1; end > 0; end--) {
    swap(points, 0, end);
    siftDown(points, 0, end, comparator);
  }
}

/**
 * Sorts a mutable point array in place by `x`, then `y`, then identifier.
 *
 * @remarks Runs in $\Theta(n\log n)$ time in all cases and uses $O(1)$
 * auxiliary space.
 */
export function heapSortByX(points: Point[]): void {
  heapSort(points, comparePointsByX);
}

/**
 * Sorts a mutable point array in place by `y`, then `x`, then identifier.
 *
 * @remarks Runs in $\Theta(n\log n)$ time in all cases and uses $O(1)$
 * auxiliary space.
 */
export function heapSortByY(points: Point[]): void {
  heapSort(points, comparePointsByY);
}
