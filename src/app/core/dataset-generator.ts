import type { Point } from './models';

function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates unique random points for either the general or vertical distribution.
 *
 * @param size - Positive number of points to create.
 * @param sameX - Whether every point must use `x = 1`.
 * @returns A new immutable view of generated points with sequential identifiers.
 * @throws `Error` when `size` is not a positive integer.
 */
export function generatePoints(size: number, sameX: boolean): readonly Point[] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error('Size must be a positive integer');
  }
  const points: Point[] = [];
  const usedPairs = new Set<string>();

  for (let index = 0; index < size; index++) {
    let x: number;
    let y: number;
    let key: string;

    do {
      if (sameX) {
        const auxiliary = randomInteger(7, 1006);
        const multiplier = randomInteger(0, 2);

        x = 1;
        y = auxiliary / (index + 1 + index * 0.1);
        y += (index % 500) - multiplier * randomInteger(0, 99);
      } else {
        const numeratorX = randomInteger(1, 4000);
        const denominatorX = randomInteger(7, 17);
        const numeratorY = randomInteger(1, 4000);
        const denominatorY = randomInteger(7, 17);

        x = numeratorX / (denominatorX + 0.37);
        y = numeratorY / (denominatorY + 0.37);
      }

      key = `${Number(x.toFixed(10))},${Number(y.toFixed(10))}`;
    } while (usedPairs.has(key));

    usedPairs.add(key);
    points.push({ id: index + 1, x, y });
  }

  return points;
}
