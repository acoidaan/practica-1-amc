import type { ExperimentConfig, ExperimentResult } from './experiment-runner';
import { serializeExperimentCsv } from './experiment-csv';

const CONFIG: ExperimentConfig = {
  sizes: [200],
  repetitions: 10,
  sameX: false,
  strategyIds: ['exhaustive', 'divide-conquer-improved'],
};

const RESULT: ExperimentResult = {
  rows: [
    {
      size: 200,
      strategies: [
        {
          id: 'exhaustive',
          name: 'Exhaustivo',
          averageElapsedMilliseconds: 12.5,
          averageDistanceCalculations: 19_900,
          measurementBatchSize: 5,
        },
        {
          id: 'divide-conquer-improved',
          name: 'DyV Mejorado',
          averageElapsedMilliseconds: 1.25,
          averageDistanceCalculations: 501.5,
          measurementBatchSize: 2,
        },
      ],
    },
  ],
};

describe('serializeExperimentCsv', () => {
  it('should serialize methodology and every strategy average', () => {
    const csv = serializeExperimentCsv(CONFIG, RESULT);

    expect(csv).toBe(
      [
        'distribucion,repeticiones,talla,estrategia_id,estrategia,metodo_medicion,ejecuciones_por_medicion,tiempo_medio_ms,distancias_medias',
        'general,10,200,exhaustive,Exhaustivo,calentamiento_y_lote_adaptativo,5,12.5,19900',
        'general,10,200,divide-conquer-improved,DyV Mejorado,calentamiento_y_lote_adaptativo,2,1.25,501.5',
        '',
      ].join('\n'),
    );
  });

  it('should identify the same-x distribution', () => {
    const csv = serializeExperimentCsv({ ...CONFIG, sameX: true }, RESULT);

    expect(csv).toContain('\nmisma_x,10,200,exhaustive,');
  });

  it('should remove floating-point representation artifacts', () => {
    const csv = serializeExperimentCsv(CONFIG, {
      rows: [
        {
          size: 200,
          strategies: [
            {
              ...RESULT.rows[0].strategies[0],
              averageElapsedMilliseconds: 0.19999999999999998,
            },
          ],
        },
      ],
    });

    expect(csv).toContain(',0.2,19900\n');
  });

  it('should escape strategy names containing commas or quotes', () => {
    const csv = serializeExperimentCsv(CONFIG, {
      rows: [
        {
          size: 200,
          strategies: [
            {
              ...RESULT.rows[0].strategies[0],
              name: 'Estrategia "A", base',
            },
          ],
        },
      ],
    });

    expect(csv).toContain('"Estrategia ""A"", base"');
  });
});
