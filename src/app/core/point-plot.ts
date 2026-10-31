import type { ClosestPair, Point } from './models';

/** Width of the point-plot coordinate system. */
export const PLOT_WIDTH = 800;
/** Height of the point-plot coordinate system. */
export const PLOT_HEIGHT = 500;
/** Minimum internal margin around projected coordinates. */
export const PLOT_PADDING = 32;

/** Pair-like connection rendered as a segment without requiring a known distance. */
export interface PointConnection {
  readonly first: Point;
  readonly second: Point;
}

/** Source point enriched with SVG coordinates and visualization membership. */
export interface PlotPoint {
  readonly point: Point;
  readonly plotX: number;
  readonly plotY: number;
  readonly isClosest: boolean;
  readonly isActive: boolean;
  readonly isInActiveRange: boolean;
}

/** SVG endpoints of the segment joining the closest pair. */
export interface PlotSegment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Optional recursive and strip overlays rendered by the algorithm laboratory. */
export interface PointPlotOverlay {
  readonly activePoints?: readonly Point[];
  readonly dividerX?: number;
  readonly delta?: number;
}

/** Projected vertical strip around a divide-and-conquer separator. */
export interface PlotStrip {
  readonly x: number;
  readonly width: number;
}

/** Complete view model consumed by the dataset SVG. */
export interface PointPlot {
  readonly width: number;
  readonly height: number;
  readonly points: readonly PlotPoint[];
  readonly segment: PlotSegment | undefined;
  readonly activeSegment: PlotSegment | undefined;
  readonly dividerPlotX: number | undefined;
  readonly strip: PlotStrip | undefined;
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
 * @param activeConnection - Optional pair currently compared or pruned.
 * @param overlay - Optional recursive range, divider and strip information.
 * @returns A pure SVG view model without touching the DOM.
 */
export function createPointPlot(
  points: readonly Point[],
  closestPair?: ClosestPair,
  activeConnection?: PointConnection,
  overlay: PointPlotOverlay = {},
): PointPlot {
  if (points.length === 0) {
    return {
      width: PLOT_WIDTH,
      height: PLOT_HEIGHT,
      points: [],
      segment: undefined,
      activeSegment: undefined,
      dividerPlotX: undefined,
      strip: undefined,
    };
  }

  const bounds = findBounds(points);
  const transform = createTransform(bounds);
  const activeRange = new Set(overlay.activePoints ?? []);

  const plotPoints = points.map((point): PlotPoint => {
    const position = projectPoint(point, bounds, transform);
    const isClosest =
      closestPair !== undefined && (point === closestPair.first || point === closestPair.second);
    const isActive =
      activeConnection !== undefined &&
      (point === activeConnection.first || point === activeConnection.second);

    return {
      point,
      plotX: position.plotX,
      plotY: position.plotY,
      isClosest,
      isActive,
      isInActiveRange: activeRange.has(point),
    };
  });

  const projectConnection = (connection: PointConnection | undefined): PlotSegment | undefined => {
    if (connection === undefined) return undefined;

    const firstPosition = projectPoint(connection.first, bounds, transform);
    const secondPosition = projectPoint(connection.second, bounds, transform);

    return {
      x1: firstPosition.plotX,
      y1: firstPosition.plotY,
      x2: secondPosition.plotX,
      y2: secondPosition.plotY,
    };
  };

  const dividerPlotX =
    overlay.dividerX === undefined
      ? undefined
      : transform.offsetX + (overlay.dividerX - bounds.minX) * transform.scale;

  let strip: PlotStrip | undefined = undefined;

  if (dividerPlotX !== undefined && overlay.delta !== undefined) {
    const halfWidth = overlay.delta * transform.scale;
    const left = Math.max(0, dividerPlotX - halfWidth);
    const right = Math.min(PLOT_WIDTH, dividerPlotX + halfWidth);
    strip = { x: left, width: Math.max(0, right - left) };
  }

  return {
    width: PLOT_WIDTH,
    height: PLOT_HEIGHT,
    points: plotPoints,
    segment: projectConnection(closestPair),
    activeSegment: projectConnection(activeConnection),
    dividerPlotX,
    strip,
  };
}
