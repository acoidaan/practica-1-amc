import type { Point } from './models';
import { copyPoints } from './point-copy';

it('creates an independent array with the same point references', () => {
  const original: readonly Point[] = [
    { id: 1, x: 4, y: 8 },
    { id: 2, x: 2, y: 6 },
  ];

  const copy = copyPoints(original);

  expect(copy).toEqual(original);
  expect(copy).not.toBe(original);
  expect(copy[0]).toBe(original[0]);
  expect(copy[1]).toBe(original[1]);
});

it('allows reordering the copy without changing the original order', () => {
  const original: readonly Point[] = [
    { id: 1, x: 4, y: 8 },
    { id: 2, x: 2, y: 6 },
    { id: 3, x: 9, y: 1 },
  ];

  const copy = copyPoints(original);
  [copy[0], copy[2]] = [copy[2], copy[0]];

  expect(copy.map((point) => point.id)).toEqual([3, 2, 1]);
  expect(original.map((point) => point.id)).toEqual([1, 2, 3]);
});
