import { TestBed } from '@angular/core/testing';
import { App } from './app';

class FakeWorker {
  static instances: FakeWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly postedMessages: unknown[] = [];
  terminated = false;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message: unknown): void {
    this.postedMessages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emitMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

function fileSelectionEvent(sourceText: string, fileName = 'example.tsp'): Event {
  const file = new File([sourceText], fileName);

  return {
    target: {
      files: [file],
    },
  } as unknown as Event;
}

describe('App', () => {
  beforeEach(async () => {
    FakeWorker.instances = [];
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start in light mode and persist a manual theme change', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    const host = fixture.nativeElement as HTMLElement;
    const button = host.querySelector<HTMLButtonElement>('.theme-toggle');

    expect(app.isDarkTheme).toBe(false);
    expect(host.classList.contains('dark-theme')).toBe(false);
    expect(button?.textContent).toContain('Usar modo oscuro');

    button?.click();
    await fixture.whenStable();

    expect(app.isDarkTheme).toBe(true);
    expect(host.classList.contains('dark-theme')).toBe(true);
    expect(localStorage.getItem('amc-theme')).toBe('dark');
    expect(button?.textContent).toContain('Usar modo claro');
  });

  it('should restore a stored dark theme', async () => {
    localStorage.setItem('amc-theme', 'dark');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.componentInstance.isDarkTheme).toBe(true);
    expect((fixture.nativeElement as HTMLElement).classList.contains('dark-theme')).toBe(true);
  });

  it('should expose an accessible navigation menu by pointer, click and keyboard', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const menuShell = compiled.querySelector<HTMLElement>('.menu-shell');
    const menuButton = compiled.querySelector<HTMLButtonElement>('.menu-button');

    expect(menuButton?.getAttribute('aria-expanded')).toBe('false');
    expect(compiled.querySelector('#navigation-panel')).toBeNull();

    menuShell?.dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();

    expect(menuButton?.getAttribute('aria-expanded')).toBe('true');
    expect(compiled.querySelectorAll('#navigation-panel a')).toHaveLength(5);
    expect(compiled.querySelector<HTMLAnchorElement>('a[href="/documentacion/"]')).not.toBeNull();

    menuShell?.dispatchEvent(new MouseEvent('mouseleave'));
    await fixture.whenStable();
    expect(compiled.querySelector('#navigation-panel')).toBeNull();

    menuButton?.click();
    await fixture.whenStable();
    expect(compiled.querySelector('#navigation-panel')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(menuButton?.getAttribute('aria-expanded')).toBe('false');
    expect(compiled.querySelector('#navigation-panel')).toBeNull();
  });

  it('should render the initial state without a dataset', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Práctica 1 - Par de puntos más cercano',
    );
    expect(compiled.querySelector('input[type="file"]')).not.toBeNull();
    expect(compiled.querySelector('input[type="number"]')).not.toBeNull();
    expect(compiled.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(compiled.textContent).toContain('No hay ningún dataset cargado');
    expect(compiled.querySelector('button[type="submit"]')).not.toBeNull();
    expect(compiled.querySelector('.theme-toggle')).not.toBeNull();
    expect(compiled.querySelector<HTMLAnchorElement>('.github-link')?.href).toBe(
      'https://github.com/acoidaan/practica-1-amc',
    );
    expect(compiled.querySelector('#check-strategies')).toBeNull();
    expect(compiled.querySelector('.point-plot')).toBeNull();
    expect(compiled.querySelector('.strategy-table')).toBeNull();
  });

  it('should generate, load and download a same-x dataset', async () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const sizeInput = compiled.querySelector('#dataset-size') as HTMLInputElement;
    const sameXInput = compiled.querySelector('#same-x') as HTMLInputElement;
    const form = compiled.querySelector('form');

    sizeInput.value = '5';
    sameXInput.checked = true;
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(app.generationError).toBeUndefined();
    expect(app.dataset?.fileName).toBe('dataset5.tsp');
    expect(app.dataset?.points).toHaveLength(5);
    expect(app.dataset?.points.map((point) => point.id)).toEqual([1, 2, 3, 4, 5]);
    expect(app.dataset?.points.every((point) => point.x === 1)).toBe(true);
    expect(app.dataset?.sourceText).toContain('DIMENSION: 5');
    expect(createObjectUrlSpy).toHaveBeenCalledOnce();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test');
    expect(compiled.textContent).toContain('Archivo: dataset5.tsp');
    expect(compiled.textContent).toContain('Número de puntos: 5');
    expect(compiled.querySelector('#check-strategies')).not.toBeNull();
    expect(compiled.querySelectorAll('.plot-point')).toHaveLength(5);
    expect(compiled.querySelector('.closest-segment')).toBeNull();
  });

  it('should reject an invalid generated-dataset size', async () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const sizeInput = compiled.querySelector('#dataset-size') as HTMLInputElement;
    const form = compiled.querySelector('form');

    sizeInput.value = '2.5';
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(app.dataset).toBeUndefined();
    expect(app.generationError).toBe('El número de puntos debe ser un entero positivo.');
    expect(createObjectUrlSpy).not.toHaveBeenCalled();
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
      'El número de puntos debe ser un entero positivo.',
    );
  });

  it('should load and render a valid TSPLIB file', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    const sourceText = `DIMENSION: 2
NODE_COORD_SECTION
7 1.5 2.5
9 3 4
EOF`;

    await app.onFileSelected(fileSelectionEvent(sourceText));
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(app.dataset).toEqual({
      fileName: 'example.tsp',
      points: [
        { id: 7, x: 1.5, y: 2.5 },
        { id: 9, x: 3, y: 4 },
      ],
      sourceText,
    });
    expect(app.loadError).toBeUndefined();
    expect(compiled.textContent).toContain('Archivo: example.tsp');
    expect(compiled.textContent).toContain('Número de puntos: 2');
    expect(compiled.querySelectorAll('.point-list li').length).toBe(2);
    expect(compiled.querySelector('#check-strategies')).not.toBeNull();
    expect(compiled.querySelectorAll('.plot-point')).toHaveLength(2);
    expect(compiled.querySelector('.closest-segment')).toBeNull();
  });

  it('should check four strategies, format their results and download each output', async () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    const sourceText = `DIMENSION: 4
NODE_COORD_SECTION
1 0 0
2 3 4
3 4 4
4 10 1
EOF`;

    await app.onFileSelected(fileSelectionEvent(sourceText));
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector<HTMLButtonElement>('#check-strategies');

    button?.click();
    await fixture.whenStable();

    expect(app.strategyCheckError).toBeUndefined();
    expect(app.strategyCheck?.executions).toHaveLength(4);
    expect(app.strategyCheck?.distancesMatch).toBe(true);
    expect(compiled.querySelectorAll('.strategy-row')).toHaveLength(4);
    expect(compiled.querySelector('.closest-segment')).not.toBeNull();
    expect(compiled.querySelectorAll('.closest-point')).toHaveLength(2);
    expect(compiled.textContent).toContain(
      'Las cuatro estrategias coinciden en la distancia mínima.',
    );

    const distanceValues = Array.from(compiled.querySelectorAll('.distance-value')).map((cell) =>
      cell.textContent?.trim(),
    );
    expect(distanceValues).toEqual(['1.00000000', '1.00000000', '1.00000000', '1.00000000']);

    const calculationValues = Array.from(compiled.querySelectorAll('.calculations-value')).map(
      (cell) => cell.textContent?.trim(),
    );
    expect(calculationValues).toEqual(['6', '3', '4', '4']);

    const timeValues = Array.from(compiled.querySelectorAll('.time-value')).map((cell) =>
      cell.textContent?.trim(),
    );
    expect(timeValues.every((value) => /^\d+\.\d{4}$/.test(value ?? ''))).toBe(true);

    const downloadButtons = Array.from(
      compiled.querySelectorAll<HTMLButtonElement>('.download-action'),
    );
    expect(downloadButtons.map((downloadButton) => downloadButton.dataset['fileName'])).toEqual([
      'Exhaustivo.tsp',
      'ExhaustivoPoda.tsp',
      'DivideVenceras.tsp',
      'DyVMejorado.tsp',
    ]);

    for (const downloadButton of downloadButtons) {
      downloadButton.click();
    }

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(4);
    expect(anchorClickSpy).toHaveBeenCalledTimes(4);
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(4);
  });

  it('should show a clear error when the dataset does not contain a pair', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    const sourceText = `DIMENSION: 1
NODE_COORD_SECTION
1 0 0
EOF`;

    await app.onFileSelected(fileSelectionEvent(sourceText));
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('#check-strategies')?.click();
    await fixture.whenStable();

    expect(app.strategyCheck).toBeUndefined();
    expect(app.strategyCheckError).toBe(
      'Se necesitan al menos dos puntos para comprobar las estrategias.',
    );
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
      'Se necesitan al menos dos puntos',
    );
    expect(compiled.querySelector('.strategy-table')).toBeNull();
    expect(compiled.querySelectorAll('.plot-point')).toHaveLength(1);
    expect(compiled.querySelector('.closest-segment')).toBeNull();
  });

  it('should run the experimental study through a worker and display progress and averages', async () => {
    vi.stubGlobal('Worker', FakeWorker);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const runButton = compiled.querySelector<HTMLButtonElement>('#run-experiment');

    runButton?.click();
    fixture.detectChanges();

    const worker = FakeWorker.instances[0];
    expect(FakeWorker.instances).toHaveLength(1);
    expect(app.isExperimentRunning).toBe(true);
    expect(runButton?.disabled).toBe(true);
    expect(compiled.querySelector<HTMLProgressElement>('progress')?.value).toBe(0);
    expect(compiled.textContent).toContain('Preparando el primer experimento');
    expect(compiled.textContent).toContain('0 de 40 completados');
    expect(worker.postedMessages).toEqual([
      {
        type: 'start',
        config: {
          sizes: [200, 500, 1500, 5000],
          repetitions: 10,
          sameX: false,
          strategyIds: [
            'exhaustive',
            'exhaustive-pruning',
            'divide-conquer',
            'divide-conquer-improved',
          ],
        },
      },
    ]);
    expect(() => structuredClone(worker.postedMessages[0])).not.toThrow();

    worker.emitMessage({
      type: 'progress',
      progress: {
        completedExperiments: 1,
        totalExperiments: 40,
        currentSize: 200,
        currentRepetition: 1,
      },
    });
    fixture.detectChanges();

    expect(compiled.textContent).toContain('1 de 40 experimentos');
    expect(compiled.textContent).toContain('talla 200');

    compiled.querySelector<HTMLButtonElement>('.theme-toggle')?.click();
    fixture.detectChanges();
    expect(app.isDarkTheme).toBe(true);

    worker.emitMessage({
      type: 'completed',
      result: {
        rows: [
          {
            size: 200,
            strategies: [
              {
                id: 'exhaustive',
                name: 'Exhaustivo',
                averageElapsedMilliseconds: 10,
                averageDistanceCalculations: 19900,
              },
              {
                id: 'exhaustive-pruning',
                name: 'ExhaustivoPoda',
                averageElapsedMilliseconds: 2,
                averageDistanceCalculations: 300,
              },
              {
                id: 'divide-conquer',
                name: 'DivideVenceras',
                averageElapsedMilliseconds: 3,
                averageDistanceCalculations: 600,
              },
              {
                id: 'divide-conquer-improved',
                name: 'DyV Mejorado',
                averageElapsedMilliseconds: 4,
                averageDistanceCalculations: 500,
              },
            ],
          },
        ],
      },
    });
    fixture.detectChanges();

    expect(worker.terminated).toBe(true);
    expect(app.isExperimentRunning).toBe(false);
    expect(app.experimentResult?.rows).toHaveLength(1);
    expect(compiled.querySelectorAll('.experiment-row')).toHaveLength(1);
    expect(
      Array.from(compiled.querySelectorAll('.experiment-time')).map((cell) =>
        cell.textContent?.trim(),
      ),
    ).toEqual(['10.0000', '2.0000', '3.0000', '4.0000']);
    expect(compiled.querySelectorAll('.experiment-calculations')).toHaveLength(4);
    expect(compiled.querySelectorAll('.experiment-chart-line')).toHaveLength(4);
    expect(compiled.querySelectorAll('.experiment-chart-point')).toHaveLength(4);
    expect(compiled.querySelector('#download-experiment-results')).not.toBeNull();
  });

  it('should enable and run a comparison of exactly two selected strategies', async () => {
    vi.stubGlobal('Worker', FakeWorker);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    const selections = Array.from(
      compiled.querySelectorAll<HTMLInputElement>('.strategy-selection input'),
    );
    const compareTwoButton = compiled.querySelector<HTMLButtonElement>('#run-two-experiment');
    const sameXInput = compiled.querySelector<HTMLInputElement>('#experiment-same-x');

    expect(selections).toHaveLength(4);
    expect(compareTwoButton?.disabled).toBe(true);

    selections[0].click();
    fixture.detectChanges();
    expect(compareTwoButton?.disabled).toBe(true);

    selections[3].click();
    sameXInput?.click();
    fixture.detectChanges();
    expect(compareTwoButton?.disabled).toBe(false);

    compareTwoButton?.click();
    fixture.detectChanges();

    const worker = FakeWorker.instances[0];
    expect(worker.postedMessages).toEqual([
      {
        type: 'start',
        config: {
          sizes: [200, 500, 1500, 5000],
          repetitions: 10,
          sameX: true,
          strategyIds: ['exhaustive', 'divide-conquer-improved'],
        },
      },
    ]);

    worker.emitMessage({
      type: 'completed',
      result: {
        rows: [
          {
            size: 200,
            strategies: [
              {
                id: 'exhaustive',
                name: 'Exhaustivo',
                averageElapsedMilliseconds: 10,
                averageDistanceCalculations: 19_900,
              },
              {
                id: 'divide-conquer-improved',
                name: 'DyV Mejorado',
                averageElapsedMilliseconds: 2,
                averageDistanceCalculations: 500,
              },
            ],
          },
        ],
      },
    });
    fixture.detectChanges();

    sameXInput?.click();
    fixture.detectChanges();

    expect(app.experimentResultConfig?.sameX).toBe(true);
    expect(compiled.querySelectorAll('.experiment-time')).toHaveLength(2);
    expect(compiled.querySelectorAll('.experiment-calculations')).toHaveLength(2);
    expect(compiled.querySelectorAll('.experiment-chart-line')).toHaveLength(2);
    expect(compiled.querySelector('.experiment-result-summary')?.textContent).toContain(
      'misma coordenada x',
    );
  });

  it('should terminate a running experimental study when it is cancelled', async () => {
    vi.stubGlobal('Worker', FakeWorker);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('#run-experiment')?.click();
    fixture.detectChanges();

    const worker = FakeWorker.instances[0];
    compiled.querySelector<HTMLButtonElement>('#cancel-experiment')?.click();
    fixture.detectChanges();

    expect(worker.terminated).toBe(true);
    expect(fixture.componentInstance.isExperimentRunning).toBe(false);
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
      'El estudio experimental se ha cancelado.',
    );
  });

  it('should stop an experimental study when the worker becomes unresponsive', async () => {
    vi.stubGlobal('Worker', FakeWorker);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    vi.useFakeTimers();

    try {
      const compiled = fixture.nativeElement as HTMLElement;
      compiled.querySelector<HTMLButtonElement>('#run-experiment')?.click();
      fixture.detectChanges();

      const worker = FakeWorker.instances[0];
      vi.advanceTimersByTime(30_000);
      fixture.detectChanges();

      expect(worker.terminated).toBe(true);
      expect(fixture.componentInstance.isExperimentRunning).toBe(false);
      expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
        'El estudio no ha respondido durante 30 segundos',
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('should terminate the worker and display an experimental error', async () => {
    vi.stubGlobal('Worker', FakeWorker);

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    compiled.querySelector<HTMLButtonElement>('#run-experiment')?.click();
    fixture.detectChanges();

    const worker = FakeWorker.instances[0];
    worker.emitMessage({
      type: 'error',
      message: 'Strategies returned different distances',
    });
    fixture.detectChanges();

    expect(worker.terminated).toBe(true);
    expect(fixture.componentInstance.isExperimentRunning).toBe(false);
    expect(compiled.querySelector<HTMLButtonElement>('#run-experiment')?.disabled).toBe(false);
    expect(compiled.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo completar el estudio: Strategies returned different distances',
    );
  });

  it('should clear a stale strategy check and display an invalid-file error', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const app = fixture.componentInstance;
    app.dataset = {
      fileName: 'old.tsp',
      points: [
        { id: 1, x: 0, y: 0 },
        { id: 2, x: 1, y: 0 },
      ],
      sourceText: `DIMENSION: 2
NODE_COORD_SECTION
1 0 0
2 1 0
EOF`,
    };
    app.runStrategyCheck();
    expect(app.strategyCheck).toBeDefined();

    const invalidSourceText = `DIMENSION: 1
1 0 0
EOF`;
    await app.onFileSelected(fileSelectionEvent(invalidSourceText, 'invalid.tsp'));
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(app.strategyCheck).toBeUndefined();
    expect(app.strategyCheckError).toBeUndefined();
    expect(app.pointPlot).toBeUndefined();
    expect(compiled.querySelector('.strategy-table')).toBeNull();
    expect(compiled.querySelector('.point-plot')).toBeNull();
    expect(app.dataset).toBeUndefined();
    expect(app.loadError).toBe('Missing NODE_COORD_SECTION');
    expect(compiled.textContent).toContain('Error de carga: Missing NODE_COORD_SECTION');
    expect(compiled.querySelector('#check-strategies')).toBeNull();
  });
});
