import type { Point } from './models';

/**
 * Serializes a point sequence as a deterministic TSPLIB `EUC_2D` document.
 *
 * @param name - Internal dataset name written to the header.
 * @param points - Points in the exact order that should be exported.
 * @returns TSPLIB text with ten decimal places and a final `EOF` marker.
 */
export function serializeTsplib(name: string, points: readonly Point[]): string {
  const coordinateRows = points.map(
    (point) => `${point.id} ${point.x.toFixed(10)} ${point.y.toFixed(10)}`,
  );

  const lines = [
    `NAME: ${name}`,
    'TYPE: TSP',
    `DIMENSION: ${points.length}`,
    'EDGE_WEIGHT_TYPE: EUC_2D',
    'NODE_COORD_SECTION',
    ...coordinateRows,
    'EOF',
  ];

  return lines.join('\n');
}
