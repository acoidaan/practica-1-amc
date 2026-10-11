# Guía de uso

La aplicación resuelve y compara el problema del par de puntos más cercano. Todo el cálculo se ejecuta localmente en el navegador; no se envían datasets a ningún servidor.

## Ejecutar en local

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200/`.

## Cargar o generar un dataset

Se puede:

- cargar un fichero compatible con TSPLIB;
- generar un dataset aleatorio indicando su talla;
- activar **Misma coordenada x** para construir el caso vertical desfavorable.

La aplicación muestra los puntos cargados y permite descargar los datasets generados.

## Comprobar las estrategias

Con un dataset activo, **Comprobar las cuatro estrategias** ejecuta cada algoritmo sobre una copia independiente de los mismos puntos. La tabla presenta:

- pareja mínima;
- distancia mínima;
- distancias euclídeas calculadas;
- tiempo medido.

La visualización resalta los dos puntos más cercanos y el segmento que los une.

## Ejecutar el estudio experimental

El estudio utiliza las tallas mínimas requeridas: $200$, $500$, $1500$ y $5000$. Se puede comparar:

- las cuatro estrategias;
- exactamente dos estrategias seleccionadas;
- el caso general;
- el caso vertical con la misma coordenada $x$.

El trabajo se ejecuta en un Web Worker para conservar la respuesta de la interfaz. Puede cancelarse y muestra progreso, tablas, gráfica y exportación CSV.

## Construir la entrega completa

```bash
npm run site:build
```

Este comando genera la referencia TypeDoc, el portal VitePress y la aplicación Angular de producción en `dist/practica-1-amc/browser/`.

## Ejecutar las pruebas

```bash
npm test -- --watch=false
```

## Generar solo la documentación

```bash
npm run api:build
npm run docs:build
```

Para editar la memoria con recarga automática:

```bash
npm run docs:dev
```
