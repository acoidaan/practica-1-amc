import type { ExperimentResult } from './experiment-runner';
import { createExperimentChart } from './experiment-chart';

const RESULT: ExperimentResult = {
  rows: [
    {
      size: 200,
      strategies: [
        {
          id: 'exhaustive',
          name: 'Exhaustivo',
          averageElapsedMilliseconds: 10,
          averageDistanceCalculations: 19_900,
        },
        {
          id: 'divide-conquer-improved',
          name: 'DyV Mejorado',
          averageElapsedMilliseconds: 2,
          averageDistanceCalculations: 500,
        },
      ],
    },
    {
      size: 500,
      strategies: [
        {
          id: 'exhaustive',
          name: 'Exhaustivo',
          averageElapsedMilliseconds: 40,
          averageDistanceCalculations: 124_750,
        },
        {
          id: 'divide-conquer-improved',
          name: 'DyV Mejorado',
          averageElapsedMilliseconds: 5,
          averageDistanceCalculations: 1_400,
        },
      ],
    },
  ],
};

describe('createExperimentChart', () => {
  it('should create one ordered series for each strategy', () => {
    const chart = createExperimentChart(RESULT);

    expect(chart.series).toHaveLength(2);
    expect(chart.series.map(({ id }) => id)).toEqual(['exhaustive', 'divide-conquer-improved']);
    expect(chart.series[0].points.map(({ size }) => size)).toEqual([200, 500]);
    expect(chart.series[0].polylinePoints).toContain(' ');
  });

  it('should project sizes from left to right and larger times higher', () => {
    const chart = createExperimentChart(RESULT);
    const exhaustivePoints = chart.series[0].points;

    expect(exhaustivePoints[0].x).toBe(chart.plotLeft);
    expect(exhaustivePoints[1].x).toBe(chart.plotRight);
    expect(exhaustivePoints[1].y).toBeLessThan(exhaustivePoints[0].y);
    expect(chart.xTicks.map(({ value }) => value)).toEqual([200, 500]);
  });

  it('should keep zero times on the bottom axis', () => {
    const chart = createExperimentChart({
      rows: [
        {
          size: 200,
          strategies: [
            {
              id: 'exhaustive',
              name: 'Exhaustivo',
              averageElapsedMilliseconds: 0,
              averageDistanceCalculations: 0,
            },
          ],
        },
      ],
    });

    expect(chart.series[0].points[0].y).toBe(chart.plotBottom);
    expect(chart.series[0].points[0].x).toBe((chart.plotLeft + chart.plotRight) / 2);
  });

  it('should reject a missing strategy in a later row', () => {
    expect(() =>
      createExperimentChart({
        rows: [RESULT.rows[0], { size: 500, strategies: [] }],
      }),
    ).toThrowError('Missing strategy exhaustive for experiment size 500');
  });
});
