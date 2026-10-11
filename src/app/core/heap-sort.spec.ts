import { generatePoints } from './dataset-generator';
import { heapSortByX, heapSortByY } from './heap-sort';
import type { Point } from './models';
import { copyPoints } from './point-copy';
import { comparePointsByX, comparePointsByY } from './point-order';

it('sorts empty and single-point arrays', () => {
  const empty: Point[] = [];
  const single: Point[] = [{ id: 7, x: 4, y: 2 }];

  heapSortByX(empty);
  heapSortByX(single);

  expect(empty).toEqual([]);
  expect(single).toEqual([{ id: 7, x: 4, y: 2 }]);
});

it('sorts points by ascending x', () => {
  const points: Point[] = [
    { id: 7, x: 5, y: 0 },
    { id: 2, x: -1, y: 8 },
    { id: 9, x: 3, y: 4 },
  ];

  heapSortByX(points);

  expect(points.map((point) => point.id)).toEqual([2, 9, 7]);
});

it('breaks x ties by y and then by ID', () => {
  const points: Point[] = [
    { id: 5, x: 1, y: 2 },
    { id: 8, x: 1, y: 7 },
    { id: 3, x: 1, y: 2 },
    { id: 4, x: 1, y: -1 },
  ];

  heapSortByX(points);

  expect(points.map((point) => point.id)).toEqual([4, 3, 5, 8]);
});

it('matches the control sort and preserves the original array', () => {
  const original = generatePoints(100, false);
  const originalOrder = original.map((point) => point.id);
  const workingPoints = copyPoints(original);
  const expected = [...original].sort(comparePointsByX);

  heapSortByX(workingPoints);

  expect(workingPoints).toEqual(expected);
  expect(original.map((point) => point.id)).toEqual(originalOrder);
  expect(workingPoints).not.toBe(original);
  expect(new Set(workingPoints.map((point) => point.id))).toEqual(
    new Set(original.map((point) => point.id)),
  );
});

it('matches the control sort when all points share x', () => {
  const original = generatePoints(100, true);
  const workingPoints = copyPoints(original);
  const expected = [...original].sort(comparePointsByX);

  heapSortByX(workingPoints);

  expect(workingPoints).toEqual(expected);
  expect(workingPoints.every((point) => point.x === 1)).toBe(true);
});

it('sorts points by y, then x and then ID', () => {
  const points: Point[] = [
    { id: 8, x: 1, y: 7 },
    { id: 5, x: 1, y: 2 },
    { id: 3, x: 1, y: 2 },
    { id: 4, x: 3, y: -1 },
    { id: 2, x: 0, y: 2 },
  ];

  heapSortByY(points);

  expect(points.map((point) => point.id)).toEqual([4, 2, 3, 5, 8]);
});

it('matches the y-order control sort without changing the x-ordered array', () => {
  const points: Point[] = [
    { id: 1, x: 0, y: 30 },
    { id: 2, x: 1, y: 20 },
    { id: 3, x: 2, y: 10 },
  ];
  const pointsByY = [...points];
  const expected = [...points].sort(comparePointsByY);

  heapSortByY(pointsByY);

  expect(pointsByY).toEqual(expected);
  expect(points.map((point) => point.id)).toEqual([1, 2, 3]);
});
