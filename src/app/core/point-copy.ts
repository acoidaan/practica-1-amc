import type { Point } from './models';

/**
 * Creates an independently reorderable array while sharing immutable point objects.
 *
 * @param points - Original point sequence.
 * @returns A shallow array copy suitable for one strategy execution.
 */
export function copyPoints(points: readonly Point[]): Point[] {
  return [...points];
}
