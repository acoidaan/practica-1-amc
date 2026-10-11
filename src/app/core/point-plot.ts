import type { ClosestPair, Point } from './models';

/** Width of the point-plot coordinate system. */
export const PLOT_WIDTH = 800;
/** Height of the point-plot coordinate system. */
export const PLOT_HEIGHT = 500;
/** Minimum internal margin around projected coordinates. */
export const PLOT_PADDING = 32;

/** Source point enriched with SVG coordinates and solution membership. */
export interface PlotPoint {
  readonly point: Point;
  readonly plotX: number;
  readonly plotY: number;
  readonly isClosest: boolean;
}

/** SVG endpoints of the segment joining the closest pair. */
export interface PlotSegment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Complete view model consumed by the dataset SVG. */
export interface PointPlot {
  readonly width: number;
  readonly height: number;
  readonly points: readonly PlotPoint[];
  readonly segment: PlotSegment | undefined;
}

interface PlotBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

interface PlotTransform {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

interface PlotPosition {
  readonly plotX: number;
  readonly plotY: number;
}

function findBounds(points: readonly Point[]): PlotBounds {
  const first = points[0];
  let minX = first.x;
  let maxX = first.x;
  let minY = first.y;
  let maxY = first.y;

  for (let index = 1; index < points.length; index++) {
    const point = points[index];

    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

function createTransform(bounds: PlotBounds): PlotTransform {
  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const availableWidth = PLOT_WIDTH - 2 * PLOT_PADDING;
  const availableHeight = PLOT_HEIGHT - 2 * PLOT_PADDING;

  let scale: number;

  if (spanX === 0 && spanY === 0) {
    scale = 1;
  } else if (spanX === 0) {
    scale = availableHeight / spanY;
  } else if (spanY === 0) {
    scale = availableWidth / spanX;
  } else {
    scale = Math.min(availableWidth / spanX, availableHeight / spanY);
  }
  const drawnWidth = spanX * scale;
  const drawnHeight = spanY * scale;

  const offsetX = (PLOT_WIDTH - drawnWidth) / 2;
  const offsetY = (PLOT_HEIGHT - drawnHeight) / 2;

  return {
    scale,
    offsetX,
    offsetY,
  };
}

function projectPoint(point: Point, bounds: PlotBounds, transform: PlotTransform): PlotPosition {
  return {
    plotX: transform.offsetX + (point.x - bounds.minX) * transform.scale,
    plotY: transform.offsetY + (bounds.maxY - point.y) * transform.scale,
  };
}

/**
 * Projects points proportionally while centring degenerate horizontal or vertical sets.
 *
 * @param points - Dataset coordinates to project.
 * @param closestPair - Optional solution whose endpoints and segment are highlighted.
 * @returns A pure SVG view model without touching the DOM.
 */
export function createPointPlot(points: readonly Point[], closestPair?: ClosestPair): PointPlot {
  if (points.length === 0) {
    return {
      width: PLOT_WIDTH,
      height: PLOT_HEIGHT,
      points: [],
      segment: undefined,
    };
  }

  const bounds = findBounds(points);
  const transform = createTransform(bounds);

  const plotPoints = points.map((point): PlotPoint => {
    const position = projectPoint(point, bounds, transform);
    const isClosest =
      closestPair !== undefined && (point === closestPair.first || point === closestPair.second);

    return {
      point,
      plotX: position.plotX,
      plotY: position.plotY,
      isClosest,
    };
  });

  let segment: PlotSegment | undefined = undefined;

  if (closestPair !== undefined) {
    const firstPosition = projectPoint(closestPair.first, bounds, transform);
    const secondPosition = projectPoint(closestPair.second, bounds, transform);

    segment = {
      x1: firstPosition.plotX,
      y1: firstPosition.plotY,
      x2: secondPosition.plotX,
      y2: secondPosition.plotY,
    };
  }

  return {
    width: PLOT_WIDTH,
    height: PLOT_HEIGHT,
    points: plotPoints,
    segment,
  };
}
