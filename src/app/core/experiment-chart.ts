import type { ExperimentResult } from './experiment-runner';
import type { StrategyId } from './strategy-runner';

/** Width of the chart coordinate system. */
export const EXPERIMENT_CHART_WIDTH = 800;
/** Height of the chart coordinate system. */
export const EXPERIMENT_CHART_HEIGHT = 420;

const CHART_LEFT = 72;
const CHART_RIGHT = 24;
const CHART_TOP = 24;
const CHART_BOTTOM = 56;
const Y_TICK_INTERVALS = 4;

const STRATEGY_COLORS: Readonly<Record<StrategyId, string>> = {
  exhaustive: '#d95f59',
  'exhaustive-pruning': '#d9982f',
  'divide-conquer': '#3f8ccf',
  'divide-conquer-improved': '#45a66b',
};

/** One measured value projected into SVG coordinates. */
export interface ExperimentChartPoint {
  readonly size: number;
  readonly averageElapsedMilliseconds: number;
  readonly x: number;
  readonly y: number;
}

/** One strategy line, its projected points and presentation metadata. */
export interface ExperimentChartSeries {
  readonly id: StrategyId;
  readonly name: string;
  readonly color: string;
  readonly points: readonly ExperimentChartPoint[];
  readonly polylinePoints: string;
}

/** Dataset-size tick on the horizontal axis. */
export interface ExperimentChartXTick {
  readonly value: number;
  readonly x: number;
}

/** Time tick on the vertical axis. */
export interface ExperimentChartYTick {
  readonly value: number;
  readonly label: string;
  readonly y: number;
}

/** Pure SVG view model derived from an experiment result. */
export interface ExperimentChart {
  readonly width: number;
  readonly height: number;
  readonly plotLeft: number;
  readonly plotRight: number;
  readonly plotTop: number;
  readonly plotBottom: number;
  readonly xTicks: readonly ExperimentChartXTick[];
  readonly yTicks: readonly ExperimentChartYTick[];
  readonly series: readonly ExperimentChartSeries[];
}

function formatTick(value: number): string {
  const decimalPlaces = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return value.toFixed(decimalPlaces);
}

/**
 * Projects averaged experiment times into a fixed responsive SVG coordinate system.
 *
 * @param result - Experiment rows containing the same strategy set for every size.
 * @returns Axes, ticks and one line series per strategy.
 * @throws `Error` for invalid times or a strategy missing from a later row.
 */
export function createExperimentChart(result: ExperimentResult): ExperimentChart {
  const rows = [...result.rows].sort((first, second) => first.size - second.size);
  const plotRight = EXPERIMENT_CHART_WIDTH - CHART_RIGHT;
  const plotBottom = EXPERIMENT_CHART_HEIGHT - CHART_BOTTOM;
  const plotWidth = plotRight - CHART_LEFT;
  const plotHeight = plotBottom - CHART_TOP;
  const firstRow = rows[0];

  if (firstRow === undefined) {
    return {
      width: EXPERIMENT_CHART_WIDTH,
      height: EXPERIMENT_CHART_HEIGHT,
      plotLeft: CHART_LEFT,
      plotRight,
      plotTop: CHART_TOP,
      plotBottom,
      xTicks: [],
      yTicks: [],
      series: [],
    };
  }

  const minSize = rows[0].size;
  const maxSize = rows[rows.length - 1].size;
  const sizeSpan = maxSize - minSize;
  let maximumTime = 0;

  for (const row of rows) {
    for (const strategy of row.strategies) {
      const time = strategy.averageElapsedMilliseconds;

      if (!Number.isFinite(time) || time < 0) {
        throw new Error('Experiment chart times must be finite and non-negative');
      }

      if (time > maximumTime) maximumTime = time;
    }
  }

  const timeScaleMaximum = maximumTime === 0 ? 1 : maximumTime;
  const projectX = (size: number): number =>
    sizeSpan === 0
      ? CHART_LEFT + plotWidth / 2
      : CHART_LEFT + ((size - minSize) / sizeSpan) * plotWidth;
  const projectY = (time: number): number => plotBottom - (time / timeScaleMaximum) * plotHeight;

  const xTicks = rows.map((row) => ({
    value: row.size,
    x: projectX(row.size),
  }));

  const yTicks = Array.from({ length: Y_TICK_INTERVALS + 1 }, (_, index) => {
    const value = (timeScaleMaximum * index) / Y_TICK_INTERVALS;

    return {
      value,
      label: formatTick(value),
      y: projectY(value),
    };
  });

  const series = firstRow.strategies.map((firstStrategy): ExperimentChartSeries => {
    const points = rows.map((row): ExperimentChartPoint => {
      const strategy = row.strategies.find(({ id }) => id === firstStrategy.id);

      if (strategy === undefined) {
        throw new Error(`Missing strategy ${firstStrategy.id} for experiment size ${row.size}`);
      }

      return {
        size: row.size,
        averageElapsedMilliseconds: strategy.averageElapsedMilliseconds,
        x: projectX(row.size),
        y: projectY(strategy.averageElapsedMilliseconds),
      };
    });

    return {
      id: firstStrategy.id,
      name: firstStrategy.name,
      color: STRATEGY_COLORS[firstStrategy.id],
      points,
      polylinePoints: points.map(({ x, y }) => `${x},${y}`).join(' '),
    };
  });

  return {
    width: EXPERIMENT_CHART_WIDTH,
    height: EXPERIMENT_CHART_HEIGHT,
    plotLeft: CHART_LEFT,
    plotRight,
    plotTop: CHART_TOP,
    plotBottom,
    xTicks,
    yTicks,
    series,
  };
}
