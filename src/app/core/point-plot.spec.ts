import { describe, expect, it } from 'vitest';
import type { ClosestPair, Point } from './models';
import { createPointPlot, PLOT_HEIGHT, PLOT_PADDING, PLOT_WIDTH } from './point-plot';

describe('createPointPlot', () => {
  it('returns an empty plot for an empty dataset', () => {
    expect(createPointPlot([])).toEqual({
      width: PLOT_WIDTH,
      height: PLOT_HEIGHT,
      points: [],
      segment: undefined,
    });
  });

  it('projects negative coordinates and different axis ranges inside the padded area', () => {
    const points: readonly Point[] = [
      { id: 1, x: -10, y: -20 },
      { id: 2, x: 30, y: 10 },
      { id: 3, x: 5, y: 80 },
    ];

    const plot = createPointPlot(points);

    for (const plotted of plot.points) {
      expect(Number.isFinite(plotted.plotX)).toBe(true);
      expect(Number.isFinite(plotted.plotY)).toBe(true);
      const tolerance = 1e-9;
      expect(plotted.plotX).toBeGreaterThanOrEqual(PLOT_PADDING - tolerance);
      expect(plotted.plotX).toBeLessThanOrEqual(PLOT_WIDTH - PLOT_PADDING + tolerance);
      expect(plotted.plotY).toBeGreaterThanOrEqual(PLOT_PADDING - tolerance);
      expect(plotted.plotY).toBeLessThanOrEqual(PLOT_HEIGHT - PLOT_PADDING + tolerance);
    }
  });

  it('uses the same scale in both axes', () => {
    const origin: Point = { id: 1, x: 0, y: 0 };
    const horizontal: Point = { id: 2, x: 1, y: 0 };
    const vertical: Point = { id: 3, x: 0, y: 1 };

    const plot = createPointPlot([origin, horizontal, vertical]);
    const plottedOrigin = plot.points[0];
    const plottedHorizontal = plot.points[1];
    const plottedVertical = plot.points[2];

    const horizontalLength = Math.abs(plottedHorizontal.plotX - plottedOrigin.plotX);
    const verticalLength = Math.abs(plottedVertical.plotY - plottedOrigin.plotY);

    expect(horizontalLength).toBeCloseTo(verticalLength);
  });

  it('centers a dataset whose points all share the same x coordinate', () => {
    const plot = createPointPlot([
      { id: 1, x: 7, y: -10 },
      { id: 2, x: 7, y: 30 },
    ]);

    expect(plot.points.map((point) => point.plotX)).toEqual([PLOT_WIDTH / 2, PLOT_WIDTH / 2]);
    expect(plot.points[0].plotY).toBe(PLOT_HEIGHT - PLOT_PADDING);
    expect(plot.points[1].plotY).toBe(PLOT_PADDING);
  });

  it('centers a dataset whose points all share the same y coordinate', () => {
    const plot = createPointPlot([
      { id: 1, x: -10, y: 7 },
      { id: 2, x: 30, y: 7 },
    ]);

    expect(plot.points.map((point) => point.plotY)).toEqual([PLOT_HEIGHT / 2, PLOT_HEIGHT / 2]);
    expect(plot.points[0].plotX).toBe(PLOT_PADDING);
    expect(plot.points[1].plotX).toBe(PLOT_WIDTH - PLOT_PADDING);
  });

  it('centers a single point', () => {
    const point: Point = { id: 7, x: -25, y: 900 };

    const plot = createPointPlot([point]);

    expect(plot.points[0]).toMatchObject({
      point,
      plotX: PLOT_WIDTH / 2,
      plotY: PLOT_HEIGHT / 2,
      isClosest: false,
    });
  });

  it('highlights the closest pair and aligns the segment with its plotted points', () => {
    const first: Point = { id: 1, x: 0, y: 0 };
    const other: Point = { id: 2, x: 2, y: 0 };
    const second: Point = { id: 3, x: 0, y: 2 };
    const closestPair: ClosestPair = {
      first,
      second,
      distance: 2,
    };

    const plot = createPointPlot([first, other, second], closestPair);
    const plottedFirst = plot.points.find((point) => point.point === first);
    const plottedOther = plot.points.find((point) => point.point === other);
    const plottedSecond = plot.points.find((point) => point.point === second);

    expect(plottedFirst?.isClosest).toBe(true);
    expect(plottedOther?.isClosest).toBe(false);
    expect(plottedSecond?.isClosest).toBe(true);
    expect(plot.segment).toEqual({
      x1: plottedFirst?.plotX,
      y1: plottedFirst?.plotY,
      x2: plottedSecond?.plotX,
      y2: plottedSecond?.plotY,
    });
  });

  it('does not mutate the input points or their order', () => {
    const points: readonly Point[] = [
      { id: 3, x: 5, y: -1 },
      { id: 1, x: -4, y: 8 },
      { id: 2, x: 0, y: 0 },
    ];
    const snapshot = points.map((point) => ({ ...point }));

    createPointPlot(points);

    expect(points).toEqual(snapshot);
    expect(points.map((point) => point.id)).toEqual([3, 1, 2]);
  });
});
