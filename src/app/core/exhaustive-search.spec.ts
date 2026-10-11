import { exhaustiveSearch } from './exhaustive-search';
import type { Point, DistanceCounter } from './models';

it('finds the closest pair and counts every pair', () => {
  const points: readonly Point[] = [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 1, y: 0 },
    { id: 3, x: 10, y: 0 },
  ];
  const counter: DistanceCounter = { calculations: 0 };
  const candidate = exhaustiveSearch(points, counter);
  expect(points).toEqual([
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 1, y: 0 },
    { id: 3, x: 10, y: 0 },
  ]);
  expect(candidate).toEqual({ first: points[0], second: points[1], distance: 1 });
  expect(counter.calculations).toBe(3);
});

it('returns undefined without calculations for one point', () => {
  const points: readonly Point[] = [{ id: 1, x: 0, y: 0 }];
  const counter: DistanceCounter = { calculations: 0 };
  const candidate = exhaustiveSearch(points, counter);
  expect(candidate).toBeUndefined();
  expect(counter.calculations).toBe(0);
});

it('returns undefined without calculations for an empty array', () => {
  const points: readonly Point[] = [];
  const counter: DistanceCounter = { calculations: 0 };
  const candidate = exhaustiveSearch(points, counter);
  expect(candidate).toBeUndefined();
  expect(counter.calculations).toBe(0);
});

it('returns the only pair and calculates one distance', () => {
  const points: readonly Point[] = [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 3, y: 4 },
  ];
  const counter: DistanceCounter = { calculations: 0 };
  const candidate = exhaustiveSearch(points, counter);
  expect(candidate).toEqual({ first: points[0], second: points[1], distance: 5 });
  expect(counter.calculations).toBe(1);
});
