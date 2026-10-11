import type { Point } from './models';
import { comparePointsByX, comparePointsByY } from './point-order';

const point = (id: number, x: number, y: number): Point => ({ id, x, y });

it('orders points by x first', () => {
  expect(comparePointsByX(point(1, 2, 100), point(2, 5, -100))).toBeLessThan(0);
  expect(comparePointsByX(point(2, 5, -100), point(1, 2, 100))).toBeGreaterThan(0);
});

it('uses y to break an x tie', () => {
  expect(comparePointsByX(point(1, 4, 2), point(2, 4, 7))).toBeLessThan(0);
  expect(comparePointsByX(point(2, 4, 7), point(1, 4, 2))).toBeGreaterThan(0);
});

it('uses the ID to break a coordinate tie', () => {
  expect(comparePointsByX(point(3, 4, 7), point(9, 4, 7))).toBeLessThan(0);
  expect(comparePointsByX(point(9, 4, 7), point(3, 4, 7))).toBeGreaterThan(0);
});

it('returns zero for the same x-ordering values', () => {
  expect(comparePointsByX(point(3, 4, 7), point(3, 4, 7))).toBe(0);
});

it('orders points by y first', () => {
  expect(comparePointsByY(point(1, 100, 2), point(2, -100, 5))).toBeLessThan(0);
  expect(comparePointsByY(point(2, -100, 5), point(1, 100, 2))).toBeGreaterThan(0);
});

it('uses x to break a y tie', () => {
  expect(comparePointsByY(point(1, 2, 4), point(2, 7, 4))).toBeLessThan(0);
  expect(comparePointsByY(point(2, 7, 4), point(1, 2, 4))).toBeGreaterThan(0);
});

it('uses the ID to break a coordinate tie when ordering by y', () => {
  expect(comparePointsByY(point(3, 4, 7), point(9, 4, 7))).toBeLessThan(0);
  expect(comparePointsByY(point(9, 4, 7), point(3, 4, 7))).toBeGreaterThan(0);
});

it('returns zero for the same y-ordering values', () => {
  expect(comparePointsByY(point(3, 4, 7), point(3, 4, 7))).toBe(0);
});
