import { divideAndConquerImprovedSearch } from './divide-and-conquer-improved-search';
import { divideAndConquerSearch } from './divide-and-conquer-search';
import { exhaustiveSearch } from './exhaustive-search';
import type { DistanceCounter, Point } from './models';
import { copyPoints } from './point-copy';

function expectSameMinimumAsExhaustive(points: readonly Point[]): void {
  const exhaustiveCounter: DistanceCounter = { calculations: 0 };
  const improvedCounter: DistanceCounter = { calculations: 0 };
  const expected = exhaustiveSearch(points, exhaustiveCounter);
  const actual = divideAndConquerImprovedSearch(copyPoints(points), improvedCounter);

  expect(actual?.distance).toBeCloseTo(expected?.distance ?? Number.NaN, 12);
}

it('returns undefined without calculations for fewer than two points', () => {
  const empty: Point[] = [];
  const single: Point[] = [{ id: 1, x: 4, y: 8 }];
  const emptyCounter: DistanceCounter = { calculations: 0 };
  const singleCounter: DistanceCounter = { calculations: 0 };

  expect(divideAndConquerImprovedSearch(empty, emptyCounter)).toBeUndefined();
  expect(divideAndConquerImprovedSearch(single, singleCounter)).toBeUndefined();
  expect(emptyCounter.calculations).toBe(0);
  expect(singleCounter.calculations).toBe(0);
});

it('matches exhaustive search, sorts the working copy by x and preserves the original', () => {
  const original: readonly Point[] = [
    { id: 1, x: 10, y: -5 },
    { id: 2, x: 0, y: 40 },
    { id: 3, x: 1, y: 20 },
    { id: 4, x: 20, y: 0 },
  ];
  const originalOrder = original.map((point) => point.id);
  const exhaustiveCounter: DistanceCounter = { calculations: 0 };
  const improvedCounter: DistanceCounter = { calculations: 0 };
  const expected = exhaustiveSearch(original, exhaustiveCounter);
  const workingPoints = copyPoints(original);

  const actual = divideAndConquerImprovedSearch(workingPoints, improvedCounter);

  expect(actual?.distance).toBe(expected?.distance);
  expect(workingPoints.map((point) => point.id)).toEqual([2, 3, 1, 4]);
  expect(original.map((point) => point.id)).toEqual(originalOrder);
});

it('finds a closest pair entirely inside the left half', () => {
  const points: readonly Point[] = [
    { id: 1, x: 5, y: 30 },
    { id: 2, x: 30, y: -2 },
    { id: 3, x: 0.25, y: 0 },
    { id: 4, x: 20, y: 12 },
    { id: 5, x: 0, y: 0 },
    { id: 6, x: 10, y: 50 },
  ];
  const counter: DistanceCounter = { calculations: 0 };

  const result = divideAndConquerImprovedSearch(copyPoints(points), counter);

  expect(result?.distance).toBeCloseTo(0.25, 12);
  expectSameMinimumAsExhaustive(points);
});

it('finds a closest pair entirely inside the right half', () => {
  const points: readonly Point[] = [
    { id: 1, x: 30, y: 0 },
    { id: 2, x: 0, y: 40 },
    { id: 3, x: 50, y: -10 },
    { id: 4, x: 20, y: 20 },
    { id: 5, x: 30.2, y: 0 },
    { id: 6, x: 10, y: 60 },
  ];
  const counter: DistanceCounter = { calculations: 0 };

  const result = divideAndConquerImprovedSearch(copyPoints(points), counter);

  expect(result?.distance).toBeCloseTo(0.2, 12);
  expectSameMinimumAsExhaustive(points);
});

it('finds a closest pair crossing the division', () => {
  const points: readonly Point[] = [
    { id: 1, x: 10, y: 30 },
    { id: 2, x: 4.9, y: 0 },
    { id: 3, x: 0, y: 50 },
    { id: 4, x: 20, y: -20 },
    { id: 5, x: 5.1, y: 0 },
    { id: 6, x: 1, y: 10 },
  ];
  const counter: DistanceCounter = { calculations: 0 };

  const result = divideAndConquerImprovedSearch(copyPoints(points), counter);

  expect(result?.distance).toBeCloseTo(0.2, 12);
  expectSameMinimumAsExhaustive(points);
});

it('preserves side membership when equal x coordinates cross the division', () => {
  const points: readonly Point[] = [
    { id: 1, x: 1, y: 0.1 },
    { id: 2, x: 0, y: 20 },
    { id: 3, x: 2, y: 30 },
    { id: 4, x: 1, y: 0 },
  ];
  const counter: DistanceCounter = { calculations: 0 };

  const result = divideAndConquerImprovedSearch(copyPoints(points), counter);

  expect(result?.distance).toBeCloseTo(0.1, 12);
  expectSameMinimumAsExhaustive(points);
});

it('matches exhaustive search across many deterministic datasets', () => {
  let state = 0x5a17c9e3;
  const nextCoordinate = (): number => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    return (state / 0x1_0000_0000) * 200 - 100;
  };

  for (let size = 2; size <= 50; size++) {
    for (let sample = 0; sample < 12; sample++) {
      const points: Point[] = Array.from({ length: size }, (_, index) => ({
        id: index + 1,
        x: sample % 2 === 0 ? Math.trunc(nextCoordinate() / 20) : nextCoordinate(),
        y: nextCoordinate(),
      }));

      expectSameMinimumAsExhaustive(points);
    }
  }
});

it('reduces distance calculations drastically when all points share x', () => {
  const points: Point[] = Array.from({ length: 128 }, (_, index) => ({
    id: index + 1,
    x: 1,
    y: (index * 73) % 257,
  }));
  const basicCounter: DistanceCounter = { calculations: 0 };
  const improvedCounter: DistanceCounter = { calculations: 0 };
  const basicResult = divideAndConquerSearch(copyPoints(points), basicCounter);
  const improvedResult = divideAndConquerImprovedSearch(copyPoints(points), improvedCounter);

  expect(improvedResult?.distance).toBe(basicResult?.distance);
  expect(improvedCounter.calculations).toBeLessThan(basicCounter.calculations / 4);
  expectSameMinimumAsExhaustive(points);
});
