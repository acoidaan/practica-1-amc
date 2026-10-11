import { generatePoints } from './dataset-generator';
import type { Point } from './models';
import { parseTsplib } from './tsplib-parser';
import { serializeTsplib } from './tsplib-writer';

function roundPointsToTenDecimals(points: readonly Point[]): readonly Point[] {
  return points.map((point) => ({
    id: point.id,
    x: Number(point.x.toFixed(10)),
    y: Number(point.y.toFixed(10)),
  }));
}

it('serializes a TSPLIB dataset with ten decimal places', () => {
  const points: readonly Point[] = [
    { id: 1, x: 1.5, y: -2.25 },
    { id: 2, x: 3, y: 4.125 },
  ];

  const sourceText = serializeTsplib('dataset2', points);

  expect(sourceText).toBe(`NAME: dataset2
TYPE: TSP
DIMENSION: 2
EDGE_WEIGHT_TYPE: EUC_2D
NODE_COORD_SECTION
1 1.5000000000 -2.2500000000
2 3.0000000000 4.1250000000
EOF`);
});

it('round-trips a generated general dataset through the parser', () => {
  const points = generatePoints(25, false);
  const sourceText = serializeTsplib('dataset25', points);

  const parsedDataset = parseTsplib('dataset25.tsp', sourceText);

  expect(parsedDataset.points).toEqual(roundPointsToTenDecimals(points));
});

it('round-trips a large same-x dataset without repeated serialized points', () => {
  const size = 1000;
  const points = generatePoints(size, true);
  const sourceText = serializeTsplib(`dataset${size}`, points);

  const parsedDataset = parseTsplib(`dataset${size}.tsp`, sourceText);
  const parsedPairs = new Set(parsedDataset.points.map((point) => `${point.x},${point.y}`));

  expect(parsedDataset.points).toEqual(roundPointsToTenDecimals(points));
  expect(parsedPairs.size).toBe(size);
});
