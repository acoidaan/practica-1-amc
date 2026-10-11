import type { ExperimentConfig, ExperimentResult } from './experiment-runner';

const CSV_HEADER = [
  'distribucion',
  'repeticiones',
  'talla',
  'estrategia_id',
  'estrategia',
  'metodo_medicion',
  'ejecuciones_por_medicion',
  'tiempo_medio_ms',
  'distancias_medias',
] as const;

function escapeCsvCell(value: string | number): string {
  const text = String(value);

  if (!/[",\n\r]/.test(text)) return text;

  return `"${text.replaceAll('"', '""')}"`;
}

function formatMetric(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error('Experiment metrics must be finite');
  }

  return value.toFixed(6).replace(/\.?0+$/, '');
}

/**
 * Serializes an experiment in long CSV form: one strategy and size per row.
 *
 * @remarks Configuration metadata and adaptive batch sizes are included so the
 * exported measurements remain interpretable outside the application.
 *
 * @param config - Configuration actually used to obtain the result.
 * @param result - Averaged experiment rows.
 * @returns RFC-compatible CSV text terminated by a newline.
 */
export function serializeExperimentCsv(config: ExperimentConfig, result: ExperimentResult): string {
  const distribution = config.sameX ? 'misma_x' : 'general';
  const lines: string[] = [CSV_HEADER.join(',')];

  for (const row of result.rows) {
    for (const strategy of row.strategies) {
      lines.push(
        [
          distribution,
          config.repetitions,
          row.size,
          strategy.id,
          strategy.name,
          'calentamiento_y_lote_adaptativo',
          strategy.measurementBatchSize ?? 1,
          formatMetric(strategy.averageElapsedMilliseconds),
          formatMetric(strategy.averageDistanceCalculations),
        ]
          .map(escapeCsvCell)
          .join(','),
      );
    }
  }

  return `${lines.join('\n')}\n`;
}
