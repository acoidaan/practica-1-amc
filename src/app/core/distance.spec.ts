import { distanceBetween } from './distance';
import type { Point, DistanceCounter } from './models';

it('calculates distance and counts once', () => {
  const pointA: Point = { id: 1, x: 0, y: 0 };
  const pointB: Point = { id: 2, x: 3, y: 4 };
  const contador: DistanceCounter = { calculations: 0 };

  const distance = distanceBetween(pointA, pointB, contador);
  expect(pointA).toEqual({ id: 1, x: 0, y: 0 });
  expect(pointB).toEqual({ id: 2, x: 3, y: 4 });
  expect(distance).toBe(5);
  expect(contador.calculations).toBe(1);
});

it('calculates distance and counts twice', () => {
  const pointA: Point = { id: 3, x: 0, y: 0 };
  const pointB: Point = { id: 4, x: 3, y: 4 };
  const contador: DistanceCounter = { calculations: 0 };

  const distance = distanceBetween(pointA, pointB, contador);
  const distance2 = distanceBetween(pointA, pointB, contador);
  expect(distance).toBe(5);
  expect(distance2).toBe(5);
  expect(contador.calculations).toBe(2);
});
