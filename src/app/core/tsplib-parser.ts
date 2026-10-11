import type { Dataset, Point } from './models';

/**
 * Parses the supported TSPLIB coordinate subset and preserves its original text.
 *
 * @param fileName - Name associated with the uploaded source.
 * @param sourceText - Complete TSPLIB text.
 * @returns The validated dataset and its parsed points.
 * @throws `Error` when required headers, dimensions or coordinate rows are invalid.
 */
export function parseTsplib(fileName: string, sourceText: string): Dataset {
  const lines = sourceText.split(/\r?\n/);
  const dimensionLine = lines.find((line) => line.trim().startsWith('DIMENSION'));
  const coordinateSectionIndex = lines.findIndex((line) => line.trim() === 'NODE_COORD_SECTION');

  if (dimensionLine === undefined) {
    throw new Error('Missing DIMENSION');
  }

  if (coordinateSectionIndex === -1) {
    throw new Error('Missing NODE_COORD_SECTION');
  }

  const dimensionParts = dimensionLine.split(':');
  if (dimensionParts.length !== 2) {
    throw new Error('Invalid DIMENSION');
  }

  const dimension = Number(dimensionParts[1].trim());

  if (!Number.isInteger(dimension) || dimension <= 0) {
    throw new Error('Invalid DIMENSION');
  }

  const points: Point[] = [];
  for (let lineIndex = coordinateSectionIndex + 1; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex].trim();

    if (line === '') {
      continue;
    }

    if (line === 'EOF') {
      break;
    }

    const fields = line.split(/\s+/);
    if (fields.length !== 3) {
      throw new Error('Invalid coordinate row');
    }

    const id = Number(fields[0]);
    const x = Number(fields[1]);
    const y = Number(fields[2]);

    if (!Number.isInteger(id) || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Invalid coordinate row');
    }

    points.push({ id, x, y });
  }

  if (points.length !== dimension) {
    throw new Error('Point count does not match DIMENSION');
  }

  return {
    fileName,
    points,
    sourceText,
  };
}
