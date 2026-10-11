/**
 * Shared domain types for datasets, points and algorithm results.
 *
 * @packageDocumentation
 */

/** An immutable point in the Euclidean plane. */
export interface Point {
  /** Stable identifier read from or written to TSPLIB. */
  readonly id: number;
  /** Horizontal coordinate. */
  readonly x: number;
  /** Vertical coordinate. */
  readonly y: number;
}

/** Mutable instrumentation owned by one algorithm execution. */
export interface DistanceCounter {
  /** Number of Euclidean distances evaluated through `distanceBetween`. */
  calculations: number;
}

/** A parsed or generated TSPLIB dataset. */
export interface Dataset {
  /** Source file name shown in the interface. */
  readonly fileName: string;
  /** Immutable view of the dataset points. */
  readonly points: readonly Point[];
  /** Original TSPLIB text, preserved for byte-identical exhaustive export. */
  readonly sourceText: string;
}

/** Two points and the Euclidean distance between them. */
export interface ClosestPair {
  readonly first: Point;
  readonly second: Point;
  readonly distance: number;
}

/** Common observable result produced by every search strategy. */
export interface AlgorithmResult {
  readonly closestPair: ClosestPair;
  /** Instrumented Euclidean-distance count. */
  readonly distanceCalculations: number;
  /** Measured strategy time, including any required sorting. */
  readonly elapsedMilliseconds: number;
}
