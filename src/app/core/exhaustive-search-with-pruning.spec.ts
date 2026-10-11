import { exhaustiveSearch } from './exhaustive-search';
import { exhaustiveSearchWithPruning } from './exhaustive-search-with-pruning';
import type { DistanceCounter, Point } from './models';
import { copyPoints } from './point-copy';

it('returns undefined without calculations for fewer than two points', () => {
  const empty: Point[] = [];
  const single: Point[] = [{ id: 1, x: 4, y: 8 }];
  const emptyCounter: DistanceCounter = { calculations: 0 };
  const singleCounter: DistanceCounter = { calculations: 0 };

  expect(exhaustiveSearchWithPruning(empty, emptyCounter)).toBeUndefined();
  expect(exhaustiveSearchWithPruning(single, singleCounter)).toBeUndefined();
  expect(emptyCounter.calculations).toBe(0);
  expect(singleCounter.calculations).toBe(0);
});

it('matches exhaustive search, sorts the working copy and preserves the original', () => {
  const original: readonly Point[] = [
    { id: 1, x: 10, y: 0 },
    { id: 2, x: 0, y: 0 },
    { id: 3, x: 1, y: 0 },
    { id: 4, x: 20, y: 0 },
  ];
  const originalOrder = original.map((point) => point.id);
  const exhaustiveCounter: DistanceCounter = { calculations: 0 };
  const pruningCounter: DistanceCounter = { calculations: 0 };
  const expected = exhaustiveSearch(original, exhaustiveCounter);
  const workingPoints = copyPoints(original);

  const actual = exhaustiveSearchWithPruning(workingPoints, pruningCounter);

  expect(actual?.distance).toBe(expected?.distance);
  expect(workingPoints.map((point) => point.id)).toEqual([2, 3, 1, 4]);
  expect(original.map((point) => point.id)).toEqual(originalOrder);
});

it('prunes before calculating distances that cannot improve the result', () => {
  const points: Point[] = [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 1, y: 0 },
    { id: 3, x: 10, y: 0 },
    { id: 4, x: 20, y: 0 },
  ];
  const counter: DistanceCounter = { calculations: 0 };

  const result = exhaustiveSearchWithPruning(points, counter);

  expect(result?.distance).toBe(1);
  expect(counter.calculations).toBe(1);
});

it('calculates fewer distances than exhaustive search on separated points', () => {
  const points: readonly Point[] = [
    { id: 1, x: 20, y: 0 },
    { id: 2, x: 1, y: 0 },
    { id: 3, x: 10, y: 0 },
    { id: 4, x: 0, y: 0 },
  ];
  const exhaustiveCounter: DistanceCounter = { calculations: 0 };
  const pruningCounter: DistanceCounter = { calculations: 0 };
  const expected = exhaustiveSearch(points, exhaustiveCounter);
  const actual = exhaustiveSearchWithPruning(copyPoints(points), pruningCounter);

  expect(actual?.distance).toBe(expected?.distance);
  expect(pruningCounter.calculations).toBeLessThan(exhaustiveCounter.calculations);
  expect(exhaustiveCounter.calculations).toBe(6);
});

it('cannot prune pairs when all points share the same x coordinate', () => {
  const points: Point[] = [
    { id: 1, x: 1, y: 30 },
    { id: 2, x: 1, y: 0 },
    { id: 3, x: 1, y: 11 },
    { id: 4, x: 1, y: 10 },
  ];
  const counter: DistanceCounter = { calculations: 0 };

  const result = exhaustiveSearchWithPruning(points, counter);

  expect(result?.distance).toBe(1);
  expect(counter.calculations).toBe((points.length * (points.length - 1)) / 2);
});
