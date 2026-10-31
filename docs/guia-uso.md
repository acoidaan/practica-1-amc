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

## Utilizar el laboratorio de algoritmos

Con un dataset de entre $2$ y $120$ puntos, el bloque **Laboratorio de algoritmos** permite:

- elegir cualquiera de las cuatro estrategias;
- reproducir, pausar, reiniciar o avanzar paso a paso;
- comparar dos estrategias de manera sincronizada;
- ajustar la velocidad de la animación;
- mostrar los identificadores de los puntos;
- acercar, alejar y desplazar el plano;
- ver en naranja la pareja cuya distancia se calcula;
- ver con trazo discontinuo una poda que evita calcular distancias;
- conservar en verde la mejor pareja conocida;
- observar la división, la franja de anchura $2\delta$ y el nivel recursivo;
- seguir el fragmento TypeScript cuya línea activa se resalta automáticamente.

La aplicación ejecuta el algoritmo real con un observador opcional y después reproduce los eventos registrados. El plano, la explicación y el código avanzan desde la misma traza. Esta reproducción está separada de la medición experimental para que el renderizado y las pausas no alteren los tiempos.

El flujo de la página es lineal: dataset, laboratorio, comprobación y experimentos. Los botones que producen resultados están situados junto a sus salidas y la lista completa de puntos permanece plegada hasta que se necesita.

El límite de $120$ puntos evita almacenar millones de eventos en estrategias cuadráticas. No afecta a la comprobación normal ni al estudio experimental.

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
