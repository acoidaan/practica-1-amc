# Práctica 1 AMC — Par de puntos más cercano

[Aplicación](https://practica-1-amc.vercel.app) · [Documentación](https://practica-1-amc.vercel.app/documentacion/) · [Memoria PDF](https://practica-1-amc.vercel.app/documentacion/downloads/memoria-practica-1-amc.pdf) · [Código en GitHub](https://github.com/acoidaan/practica-1-amc)

Aplicación Angular para implementar, visualizar y comparar cuatro estrategias del problema del par de puntos más cercano:

- búsqueda exhaustiva;
- búsqueda exhaustiva con poda;
- divide y vencerás básico;
- divide y vencerás mejorado.

Incluye carga y generación de datasets TSPLIB, HeapSort propio, visualización SVG, estudio experimental en Web Worker, exportación CSV, memoria VitePress y referencia TypeDoc.

## Requisitos

- Node.js `22.23.3` — definido en `.nvmrc`;
- npm `10.9.9` o compatible.

```bash
nvm use
npm install
```

## Desarrollo

```bash
npm start
```

La aplicación queda disponible en `http://localhost:4200/`.

## Verificación

```bash
npm test -- --watch=false
npm run site:build
npm audit
git diff --check
```

La suite actual contiene **20 archivos y 103 pruebas**.

## Documentación

La fuente de la memoria se encuentra en [`docs/memoria.md`](docs/memoria.md). Para trabajar en el portal con recarga automática:

```bash
npm run docs:dev
```

Para regenerar figuras, referencia TypeDoc, portal y aplicación:

```bash
npm run site:build
```

La salida completa queda en:

```text
dist/practica-1-amc/browser/
├── index.html
├── worker-*.js
└── documentacion/
    ├── index.html
    ├── memoria.html
    └── api/
```

La memoria tiene estilos de impresión A4 y puede guardarse como PDF desde el navegador.

## Evidencia experimental

Los CSV revisados se conservan en [`results/`](results/):

- `resultados-general-4-estrategias.csv`;
- `resultados-misma-x-4-estrategias.csv`.

Las figuras de la memoria se regeneran automáticamente a partir de esos ficheros mediante [`scripts/generate-doc-figures.mjs`](scripts/generate-doc-figures.mjs).

## Arquitectura

```text
src/app/
├── core/       algoritmos y transformaciones puras
├── browser/    descargas, protocolo y Web Worker
├── app.ts      estado y coordinación Angular
├── app.html    interfaz
└── app.css     sistema visual responsive
```

La generación de datos, las copias y el renderizado quedan fuera del intervalo medido. Las ordenaciones requeridas por cada estrategia permanecen dentro.

## Despliegue en Vercel

Al importar el repositorio en Vercel debe seleccionarse como **Root Directory**:

```text
projects/Algoritmica y Modelos de Computacion/Practica 1
```

[`vercel.json`](vercel.json) configura:

- comando: `npm run site:build`;
- salida: `dist/practica-1-amc/browser`.

El proyecto es completamente estático. Los algoritmos y el Web Worker se ejecutan en el navegador; no se necesita backend y los datasets no se envían a ningún servidor.
