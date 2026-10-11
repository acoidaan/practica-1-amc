import { generatePoints } from './dataset-generator';

it('rejects invalid sizes', () => {
  expect(() => generatePoints(0, false)).toThrow('Size must be a positive integer');
  expect(() => generatePoints(-1, false)).toThrow('Size must be a positive integer');
  expect(() => generatePoints(2.5, false)).toThrow('Size must be a positive integer');
});

it('generates a general dataset with consecutive IDs and unique points', () => {
  const points = generatePoints(4, false);

  expect(points).toHaveLength(4);
  expect(points.map((point) => point.id)).toEqual([1, 2, 3, 4]);

  const uniquePairs = new Set(points.map((point) => `${point.x},${point.y}`));

  expect(uniquePairs.size).toBe(4);
  expect(points.every((point) => point.x === 1)).toBe(false);
});

it('generates a same-x dataset with unique points', () => {
  const points = generatePoints(100, true);

  expect(points).toHaveLength(100);
  expect(points.every((point) => point.x === 1)).toBe(true);

  const uniquePairs = new Set(points.map((point) => `${point.x},${point.y}`));

  expect(uniquePairs.size).toBe(100);
});
