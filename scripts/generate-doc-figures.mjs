import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const resultsDir = join(projectRoot, 'results');
const publicDir = join(projectRoot, 'docs', 'public');
const figuresDir = join(publicDir, 'figures');
const dataDir = join(publicDir, 'data');

const sources = {
  general: 'resultados-general-4-estrategias.csv',
  sameX: 'resultados-misma-x-4-estrategias.csv',
};

const strategyColors = {
  exhaustive: '#0071e3',
  'exhaustive-pruning': '#ff7a00',
  'divide-conquer': '#34a853',
  'divide-conquer-improved': '#7c3aed',
};

function parseCsv(source) {
  const [headerLine, ...lines] = source.trim().split(/\r?\n/);
  const headers = headerLine.split(',');

  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function niceMaximum(value, intervals) {
  const roughStep = value / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalizedStep = roughStep / magnitude;
  const factor = normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10;
  return factor * magnitude * intervals;
}

function createTimeChart(rows, title, description) {
  const width = 920;
  const height = 540;
  const plot = { left: 82, right: 884, top: 112, bottom: 450 };
  const sizes = [...new Set(rows.map((row) => Number(row.talla)))].sort((a, b) => a - b);
  const strategies = [...new Set(rows.map((row) => row.estrategia_id))];
  const yTickIntervals = 6;
  const maximum = niceMaximum(
    Math.max(...rows.map((row) => Number(row.tiempo_medio_ms))),
    yTickIntervals,
  );
  const x = (size) =>
    plot.left +
    ((size - sizes[0]) / (sizes[sizes.length - 1] - sizes[0])) * (plot.right - plot.left);
  const y = (time) => plot.bottom - (time / maximum) * (plot.bottom - plot.top);
  const yTicks = Array.from(
    { length: yTickIntervals + 1 },
    (_, index) => (maximum * index) / yTickIntervals,
  );

  const grid = yTicks
    .map(
      (tick) => `
      <line class="grid" x1="${plot.left}" x2="${plot.right}" y1="${y(tick)}" y2="${y(tick)}" />
      <text class="tick" x="${plot.left - 14}" y="${y(tick) + 4}" text-anchor="end">${tick.toFixed(tick < 1 ? 2 : 0)}</text>`,
    )
    .join('');

  const xTicks = sizes
    .map(
      (size) => `
      <line class="axis" x1="${x(size)}" x2="${x(size)}" y1="${plot.bottom}" y2="${plot.bottom + 7}" />
      <text class="tick" x="${x(size)}" y="${plot.bottom + 28}" text-anchor="middle">${size}</text>`,
    )
    .join('');

  const series = strategies
    .map((strategyId) => {
      const strategyRows = rows
        .filter((row) => row.estrategia_id === strategyId)
        .sort((first, second) => Number(first.talla) - Number(second.talla));
      const color = strategyColors[strategyId];
      const points = strategyRows
        .map(
          (row) =>
            `${x(Number(row.talla)).toFixed(2)},${y(Number(row.tiempo_medio_ms)).toFixed(2)}`,
        )
        .join(' ');
      const circles = strategyRows
        .map(
          (row) => `
        <circle cx="${x(Number(row.talla))}" cy="${y(Number(row.tiempo_medio_ms))}" r="5" fill="${color}">
          <title>${escapeXml(row.estrategia)} · n=${row.talla} · ${row.tiempo_medio_ms} ms</title>
        </circle>`,
        )
        .join('');

      return `<polyline class="series" stroke="${color}" points="${points}" />${circles}`;
    })
    .join('');

  const legend = strategies
    .map((strategyId, index) => {
      const row = rows.find((candidate) => candidate.estrategia_id === strategyId);
      const column = index % 2;
      const line = Math.floor(index / 2);
      const legendX = 505 + column * 195;
      const legendY = 45 + line * 25;
      return `<circle cx="${legendX}" cy="${legendY}" r="5" fill="${strategyColors[strategyId]}" />
      <text class="legend" x="${legendX + 12}" y="${legendY + 4}">${escapeXml(row.estrategia)}</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 ${width} ${height}">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(description)}</desc>
  <style>
    .background { fill: #fff; stroke: #d2d2d7; }
    .title { fill: #1d1d1f; font: 700 23px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .subtitle, .tick, .axis-title, .legend { fill: #6e6e73; font: 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .legend { fill: #1d1d1f; }
    .grid { stroke: #e5e7eb; stroke-width: 1; }
    .axis { stroke: #6e6e73; stroke-width: 1.2; }
    .series { fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  </style>
  <rect class="background" x="1" y="1" width="918" height="538" rx="20" />
  <text class="title" x="42" y="49">${escapeXml(title)}</text>
  <text class="subtitle" x="42" y="73">Media de 10 repeticiones · menor tiempo es mejor</text>
  ${legend}
  ${grid}
  <line class="axis" x1="${plot.left}" x2="${plot.left}" y1="${plot.top}" y2="${plot.bottom}" />
  <line class="axis" x1="${plot.left}" x2="${plot.right}" y1="${plot.bottom}" y2="${plot.bottom}" />
  ${xTicks}
  ${series}
  <text class="axis-title" x="${(plot.left + plot.right) / 2}" y="510" text-anchor="middle">Talla n</text>
  <text class="axis-title" x="22" y="${(plot.top + plot.bottom) / 2}" text-anchor="middle" transform="rotate(-90 22 ${(plot.top + plot.bottom) / 2})">Tiempo medio (ms)</text>
</svg>`;
}

function createLimitCasesFigure() {
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 920 420">
  <title id="title">Ejemplos favorable y desfavorable para la poda horizontal</title>
  <desc id="desc">A la izquierda hay puntos repartidos horizontalmente y una pareja cercana. A la derecha todos los puntos comparten coordenada x.</desc>
  <style>
    .panel { fill: #fff; stroke: #d2d2d7; }
    .heading { fill: #1d1d1f; font: 700 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .copy { fill: #6e6e73; font: 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .point { fill: #0071e3; }
    .closest { fill: #ff7a00; }
    .segment { stroke: #ff7a00; stroke-width: 4; stroke-linecap: round; }
    .guide { stroke: #a1a1a6; stroke-width: 2; stroke-dasharray: 7 7; }
  </style>
  <rect class="panel" x="1" y="1" width="918" height="418" rx="20" />
  <text class="heading" x="45" y="48">Caso favorable</text>
  <text class="copy" x="45" y="73">Una distancia pequeña permite cortar pronto por Δx.</text>
  <text class="heading" x="500" y="48">Caso desfavorable: misma x</text>
  <text class="copy" x="500" y="73">Δx = 0 y la poda horizontal no descarta parejas.</text>
  <line class="guide" x1="460" x2="460" y1="32" y2="386" />
  <circle class="point" cx="72" cy="270" r="7" /><circle class="point" cx="132" cy="155" r="7" />
  <circle class="point" cx="205" cy="304" r="7" /><circle class="point" cx="288" cy="130" r="7" />
  <circle class="point" cx="387" cy="245" r="7" /><circle class="point" cx="418" cy="112" r="7" />
  <line class="segment" x1="205" y1="304" x2="220" y2="290" />
  <circle class="closest" cx="205" cy="304" r="8" /><circle class="closest" cx="220" cy="290" r="8" />
  <line class="guide" x1="700" x2="700" y1="95" y2="365" />
  <circle class="point" cx="700" cy="115" r="7" /><circle class="point" cx="700" cy="165" r="7" />
  <circle class="point" cx="700" cy="220" r="7" /><circle class="point" cx="700" cy="285" r="7" />
  <line class="segment" x1="700" y1="325" x2="700" y2="342" />
  <circle class="closest" cx="700" cy="325" r="8" /><circle class="closest" cx="700" cy="342" r="8" />
  <text class="copy" x="45" y="382">La separación horizontal crece al avanzar en el orden por x.</text>
  <text class="copy" x="500" y="382">Las tres estrategias no mejoradas calculan todos los pares.</text>
</svg>`;
}

await mkdir(figuresDir, { recursive: true });
await mkdir(dataDir, { recursive: true });

const generalRows = parseCsv(await readFile(join(resultsDir, sources.general), 'utf8'));
const sameXRows = parseCsv(await readFile(join(resultsDir, sources.sameX), 'utf8'));

await Promise.all([
  writeFile(
    join(figuresDir, 'tiempos-caso-general.svg'),
    createTimeChart(
      generalRows,
      'Estudio experimental · caso general',
      'Gráfica de líneas con los tiempos medios de las cuatro estrategias para tallas 200, 500, 1500 y 5000.',
    ),
  ),
  writeFile(
    join(figuresDir, 'tiempos-misma-x.svg'),
    createTimeChart(
      sameXRows,
      'Estudio experimental · misma coordenada x',
      'Gráfica de líneas con los tiempos medios de las cuatro estrategias para el caso vertical.',
    ),
  ),
  writeFile(join(figuresDir, 'casos-limite.svg'), createLimitCasesFigure()),
  copyFile(join(resultsDir, sources.general), join(dataDir, sources.general)),
  copyFile(join(resultsDir, sources.sameX), join(dataDir, sources.sameX)),
]);

console.log('Figuras y CSV de documentación generados.');
