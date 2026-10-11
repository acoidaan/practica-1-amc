import type { Dataset, Point } from './models';
import { parseTsplib } from './tsplib-parser';
import { checkStrategies } from './strategy-checker';

const points: readonly Point[] = [
  { id: 4, x: 10, y: 0 },
  { id: 2, x: 3, y: 4 },
  { id: 1, x: 0, y: 0 },
  { id: 3, x: 4, y: 4 },
];

const sourceText = `NAME : original-format
TYPE : TSP
DIMENSION : 4
NODE_COORD_SECTION
4 10 0
2 3 4
1 0 0
3 4 4
EOF`;

function createDataset(datasetPoints: readonly Point[] = points): Dataset {
  return {
    fileName: 'Example.TSP',
    points: datasetPoints,
    sourceText,
  };
}

describe('checkStrategies', () => {
  it('rejects datasets that do not contain a pair', () => {
    expect(() => checkStrategies(createDataset([]))).toThrowError(RangeError);
    expect(() => checkStrategies(createDataset([points[0]]))).toThrowError(
      'At least two points are required to check strategies',
    );
  });

  it('runs all strategies with independent counters and controlled timing', () => {
    const readings = [10, 11, 20, 22, 30, 33, 40, 44];
    let readingIndex = 0;

    const checked = checkStrategies(createDataset(), () => readings[readingIndex++]);

    expect(readingIndex).toBe(8);
    expect(checked.executions.map((execution) => execution.id)).toEqual([
      'exhaustive',
      'exhaustive-pruning',
      'divide-conquer',
      'divide-conquer-improved',
    ]);
    expect(checked.executions.map((execution) => execution.result.elapsedMilliseconds)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(checked.executions.map((execution) => execution.result.distanceCalculations)).toEqual([
      6, 3, 4, 4,
    ]);
    expect(checked.executions.map((execution) => execution.result.closestPair.distance)).toEqual([
      1, 1, 1, 1,
    ]);
    expect(checked.distancesMatch).toBe(true);
  });

  it('preserves the original dataset and prepares the required TSPLIB outputs', () => {
    const dataset = createDataset();
    const originalOrder = dataset.points.map((point) => point.id);

    const checked = checkStrategies(dataset, () => 0);

    expect(dataset.points.map((point) => point.id)).toEqual(originalOrder);
    expect(checked.executions.map((execution) => execution.outputFileName)).toEqual([
      'Exhaustivo.tsp',
      'ExhaustivoPoda.tsp',
      'DivideVenceras.tsp',
      'DyVMejorado.tsp',
    ]);
    expect(checked.executions[0].outputText).toBe(sourceText);

    const orderedOutputs = checked.executions.slice(1).map((execution) => execution.outputText);
    expect(new Set(orderedOutputs).size).toBe(1);
    expect(orderedOutputs[0]).toContain('NAME: Example');

    const parsed = parseTsplib('ordered.tsp', orderedOutputs[0]);
    expect(parsed.points.map((point) => point.id)).toEqual([1, 2, 3, 4]);
  });
});
