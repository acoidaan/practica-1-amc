# Guion de defensa

Esta guía no sustituye la comprensión de la práctica. Su objetivo es ordenar la explicación y evitar que una defensa correcta se pierda por falta de estructura.

## Presentación en tres minutos

### 1. Problema

> Dado un conjunto de puntos del plano, buscamos la pareja con menor distancia euclídea. La aplicación implementa cuatro estrategias y compara tanto su tiempo como el número de distancias calculadas.

### 2. Estrategias

> El exhaustivo prueba todos los pares y sirve como referencia. La versión con poda ordena por $x$ y deja de avanzar cuando la separación horizontal ya supera la mejor distancia. Divide y vencerás básico resuelve ambas mitades y comprueba la franja cruzada, pero esa franja puede ser cuadrática. La versión mejorada mantiene también el orden por $y$ y limita a once los sucesores relevantes, obteniendo $\Theta(n\log n)$.

### 3. Experimento

> Para cada talla y repetición genero un único dataset y cada estrategia recibe una copia independiente. La copia, la generación y el renderizado quedan fuera del reloj; la ordenación sí queda dentro. El benchmark se ejecuta en un Web Worker para no bloquear Angular.

### 4. Resultado

> En el caso general, ExhaustivoPoda gana porque la poda funciona y tiene poco sobrecoste. Cuando todos los puntos comparten $x$, las tres estrategias no mejoradas calculan todos los pares y DyV mejorado gana claramente. Esto confirma que la distribución condiciona el rendimiento real.

## Demostración recomendada

1. Cargar un dataset pequeño y mostrar sus puntos.
2. Ejecutar las cuatro estrategias y señalar la igualdad de distancias.
3. Explicar por qué los contadores son diferentes.
4. Descargar uno de los resultados TSPLIB.
5. Ejecutar el estudio general y mostrar tabla, gráfica y CSV.
6. Repetir con **Misma coordenada x**.
7. Comparar el cambio de ganador.
8. Abrir la memoria y la referencia TypeDoc desde el burger.

No conviene iniciar la defensa directamente con $n=5000$. Primero debe verse el flujo completo con una entrada pequeña.

## Ideas que debes poder justificar

### ¿Por qué la poda horizontal es correcta?

Porque:

$$
d(p,q)\geq |p_x-q_x|.
$$

Si los puntos están ordenados por $x$ y esa cota ya no mejora el mínimo, los puntos posteriores tampoco podrán hacerlo.

### ¿Por qué el exhaustivo calcula $n(n-1)/2$ distancias?

Cada punto se compara únicamente con los posteriores:

$$
(n-1)+(n-2)+\cdots+1=\frac{n(n-1)}{2}.
$$

### ¿Por qué DyV básico puede ser cuadrático?

Porque su franja no está ordenada por $y$ ni limita el número de candidatos. Con la misma $x$, todos los puntos entran en la franja y la cota horizontal no poda.

### ¿Por qué DyV mejorado es $\Theta(n\log n)$?

Las ordenaciones iniciales cuestan $\Theta(n\log n)$. Cada nivel recursivo hace trabajo lineal: particiona por $y$, construye la franja y comprueba como máximo once sucesores por punto.

$$
T(n)=2T(n/2)+\Theta(n)=\Theta(n\log n).
$$

### ¿Por qué once sucesores?

Una cuadrícula de celdas de lado $\delta/2$ limita la densidad de puntos de cada mitad. La ventana relevante ocupa doce celdas y una contiene el punto actual, por lo que quedan como máximo once candidatos posteriores.

### ¿Por qué una estrategia con menos distancias puede tardar más?

El contador solo mide llamadas a la distancia euclídea. No contabiliza ordenaciones, arrays, mapas, particiones ni recursión. DyV mejorado puede ahorrar distancias y perder tiempo en ese trabajo auxiliar para tallas moderadas.

### ¿Por qué usar un Web Worker?

`async` no mueve un cálculo intensivo a otro hilo. El Worker permite que Angular siga atendiendo eventos, actualizando progreso y aceptando cancelación mientras se ejecuta el estudio.

### ¿Qué entra en la medición?

Entra la estrategia completa, incluida su ordenación. Quedan fuera generación, copia, mensajes, serialización, descarga y renderizado.

### ¿Por qué cada estrategia necesita una copia distinta?

Las estrategias que ordenan modifican el array. Compartir una única copia haría que las siguientes partiesen de un orden alterado y dejaría de ser una comparación equivalente.

### ¿Por qué se comparan distancias y no IDs?

Puede haber varias parejas empatadas con la misma distancia mínima. Todas son soluciones correctas.

## Mapa de módulos

| Módulo                                                                                                                             | Responsabilidad                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| [`models.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/models.ts)                                         | Tipos comunes                         |
| [`distance.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/distance.ts)                                     | Distancia e instrumentación           |
| [`heap-sort.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/heap-sort.ts)                                   | Ordenación propia por comparador      |
| [Archivos de búsqueda](https://github.com/acoidaan/practica-1-amc/tree/main/src/app/core)                                          | Cuatro algoritmos                     |
| [`strategy-runner.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/strategy-runner.ts)                       | Copias, reloj y contrato común        |
| [`strategy-checker.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/strategy-checker.ts)                     | Comprobación conjunta y exportaciones |
| [`experiment-runner.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/experiment-runner.ts)                   | Repeticiones, medias y coherencia     |
| [`adaptive-strategy-measurer.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/adaptive-strategy-measurer.ts) | Calentamiento, calibración y lotes    |
| [`experiment.worker.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/browser/experiment.worker.ts)                | Ejecución fuera del hilo principal    |
| [`experiment-chart.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/experiment-chart.ts)                     | Modelo SVG de la gráfica              |
| [`experiment-csv.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/core/experiment-csv.ts)                         | Evidencia reproducible                |
| [`app.ts`](https://github.com/acoidaan/practica-1-amc/blob/main/src/app/app.ts)                                                    | Estado y coordinación de interfaz     |

## Errores que no debes cometer al explicarla

- Decir que todas las estrategias son siempre $n\log n$.
- Decir que `async` crea un hilo.
- Confundir número de distancias con número total de operaciones.
- Afirmar que la copia forma parte del tiempo medido.
- Decir que se genera un dataset distinto para cada estrategia.
- Presentar los once sucesores como un número arbitrario.
- Prometer que ExhaustivoPoda gana para cualquier distribución.

## Comprobación previa a la defensa

- [ ] La aplicación abre sin errores.
- [ ] El dataset de demostración está preparado.
- [ ] Las cuatro estrategias coinciden.
- [ ] El estudio general termina y muestra cuatro líneas.
- [ ] El caso vertical muestra la degradación esperada.
- [ ] Los enlaces de documentación y API funcionan.
- [ ] Puedes explicar la frontera de medición.
- [ ] Puedes derivar las complejidades sin leerlas.
- [ ] Tienes una copia local del PDF por si falla la red.
