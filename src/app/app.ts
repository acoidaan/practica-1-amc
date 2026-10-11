import { Component, ChangeDetectorRef, HostListener, inject, OnDestroy } from '@angular/core';
import { parseTsplib } from './core/tsplib-parser';
import { downloadTextFile } from './browser/download-file';
import { generatePoints } from './core/dataset-generator';
import { serializeTsplib } from './core/tsplib-writer';
import type { Dataset, Point } from './core/models';
import type { StrategyCheckResult, StrategyExecution } from './core/strategy-checker';
import { checkStrategies } from './core/strategy-checker';
import type { PointPlot } from './core/point-plot';
import { createPointPlot } from './core/point-plot';
import type { ExperimentChart } from './core/experiment-chart';
import { createExperimentChart } from './core/experiment-chart';
import { serializeExperimentCsv } from './core/experiment-csv';
import type {
  ExperimentConfig,
  ExperimentProgress,
  ExperimentResult,
  StrategyAverage,
} from './core/experiment-runner';
import {
  DEFAULT_EXPERIMENT_REPETITIONS,
  REQUIRED_EXPERIMENT_SIZES,
} from './core/experiment-runner';
import { STRATEGIES, type StrategyId } from './core/strategy-runner';
import type {
  ExperimentWorkerRequest,
  ExperimentWorkerResponse,
} from './browser/experiment-worker-messages';

@Component({
  imports: [],
  selector: 'app-root',
  host: {
    '[class.dark-theme]': 'isDarkTheme',
  },
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  dataset: Dataset | undefined = undefined;
  pointPlot: PointPlot | undefined = undefined;
  loadError: string | undefined = undefined;
  generationError: string | undefined = undefined;
  isDarkTheme = localStorage.getItem('amc-theme') === 'dark';
  isMenuOpen = false;

  strategyCheck: StrategyCheckResult | undefined = undefined;
  strategyCheckError: string | undefined = undefined;

  readonly experimentSizes = REQUIRED_EXPERIMENT_SIZES;
  readonly experimentRepetitions = DEFAULT_EXPERIMENT_REPETITIONS;
  readonly experimentStrategies = STRATEGIES.map(({ id, name }) => ({ id, name }));
  readonly allExperimentStrategyIds = this.experimentStrategies.map(({ id }) => id);

  selectedExperimentStrategyIds: StrategyId[] = [];

  get canCompareTwoStrategies(): boolean {
    return this.selectedExperimentStrategyIds.length === 2;
  }

  get experimentResultStrategies(): readonly StrategyAverage[] {
    return this.experimentResult?.rows[0]?.strategies ?? [];
  }

  experimentProgress: ExperimentProgress | undefined = undefined;
  experimentResult: ExperimentResult | undefined = undefined;
  experimentResultConfig: ExperimentConfig | undefined = undefined;
  experimentChart: ExperimentChart | undefined = undefined;
  experimentError: string | undefined = undefined;
  isExperimentRunning = false;

  private experimentWorker: Worker | undefined = undefined;
  private experimentInactivityTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  private clearStrategyCheck(): void {
    this.strategyCheck = undefined;
    this.strategyCheckError = undefined;
  }

  ngOnDestroy(): void {
    this.experimentWorker?.terminate();
    clearTimeout(this.experimentInactivityTimer);
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('amc-theme', this.isDarkTheme ? 'dark' : 'light');
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  openMenu(): void {
    this.isMenuOpen = true;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeMenuWithEscape(): void {
    this.closeMenu();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file === undefined) return;
    this.loadError = undefined;
    this.clearStrategyCheck();
    this.dataset = undefined;
    this.refreshPointPlot();

    this.generationError = undefined;

    try {
      const sourceText = await file.text();
      this.dataset = parseTsplib(file.name, sourceText);
    } catch (error) {
      if (error instanceof Error) {
        this.loadError = error.message;
      } else {
        this.loadError = 'Unable to load file';
      }
    } finally {
      this.refreshPointPlot();
      this.changeDetectorRef.markForCheck();
    }
  }

  onGenerateDataset(event: Event, sizeText: string, sameX: boolean) {
    event.preventDefault();

    const size = Number(sizeText);

    if (!Number.isInteger(size) || size <= 0) {
      this.generationError = 'El número de puntos debe ser un entero positivo.';
      return;
    }

    const points = generatePoints(size, sameX);
    const name = `dataset${size}`;
    const fileName = `${name}.tsp`;
    const sourceText = serializeTsplib(name, points);

    this.generationError = undefined;
    this.loadError = undefined;
    this.clearStrategyCheck();
    this.dataset = {
      fileName,
      points,
      sourceText,
    };
    this.refreshPointPlot();

    downloadTextFile(fileName, sourceText);
  }

  runStrategyCheck(): void {
    if (this.dataset === undefined) return;

    this.clearStrategyCheck();

    try {
      this.strategyCheck = checkStrategies(this.dataset);
    } catch (error) {
      if (error instanceof RangeError) {
        this.strategyCheckError =
          'Se necesitan al menos dos puntos para comprobar las estrategias.';
      } else if (error instanceof Error) {
        this.strategyCheckError = `No se pudieron comprobar las estrategias: ${error.message}`;
      } else {
        this.strategyCheckError = 'No se pudieron comprobar las estrategias.';
      }
    }

    this.refreshPointPlot();
  }

  downloadStrategyOutput(execution: StrategyExecution): void {
    downloadTextFile(execution.outputFileName, execution.outputText);
  }

  setExperimentStrategySelected(strategyId: StrategyId, selected: boolean): void {
    if (selected) {
      if (!this.selectedExperimentStrategyIds.includes(strategyId)) {
        this.selectedExperimentStrategyIds = [...this.selectedExperimentStrategyIds, strategyId];
      }

      return;
    }

    this.selectedExperimentStrategyIds = this.selectedExperimentStrategyIds.filter(
      (selectedId) => selectedId !== strategyId,
    );
  }

  runExperimentStudy(sameX: boolean, strategyIds: readonly StrategyId[]): void {
    this.experimentWorker?.terminate();
    this.experimentProgress = undefined;
    this.experimentResult = undefined;
    this.experimentResultConfig = undefined;
    this.experimentChart = undefined;
    this.experimentError = undefined;

    if (typeof Worker === 'undefined') {
      this.experimentError = 'Este navegador no permite ejecutar Web Workers.';
      return;
    }

    const config: ExperimentConfig = {
      sizes: this.experimentSizes,
      repetitions: this.experimentRepetitions,
      sameX,
      strategyIds: [...strategyIds],
    };
    const worker = new Worker(new URL('./browser/experiment.worker', import.meta.url), {
      type: 'module',
    });
    this.experimentWorker = worker;
    this.isExperimentRunning = true;
    this.experimentProgress = {
      completedExperiments: 0,
      totalExperiments: config.sizes.length * config.repetitions,
      currentSize: this.experimentSizes[0],
      currentRepetition: 1,
    };
    this.resetExperimentInactivityTimer(worker);

    worker.onmessage = ({ data }: MessageEvent<ExperimentWorkerResponse>) => {
      if (this.experimentWorker !== worker) return;

      this.resetExperimentInactivityTimer(worker);

      if (data.type === 'progress') {
        this.experimentProgress = data.progress;
      } else if (data.type === 'completed') {
        this.experimentResult = data.result;
        this.experimentResultConfig = config;
        this.experimentChart = createExperimentChart(data.result);
        this.finishExperiment(worker);
      } else {
        this.finishExperiment(worker, `No se pudo completar el estudio: ${data.message}`);
      }

      this.changeDetectorRef.markForCheck();
    };

    worker.onerror = (event: ErrorEvent) => {
      if (this.experimentWorker !== worker) return;

      const detail = event.message === '' ? 'error desconocido del Worker' : event.message;
      this.finishExperiment(worker, `No se pudo completar el estudio: ${detail}`);
      this.changeDetectorRef.markForCheck();
    };

    const request: ExperimentWorkerRequest = {
      type: 'start',
      config,
    };

    worker.postMessage(request);
  }

  cancelExperimentStudy(): void {
    if (!this.isExperimentRunning) return;

    const worker = this.experimentWorker;
    this.finishExperiment(worker, 'El estudio experimental se ha cancelado.');
    this.changeDetectorRef.markForCheck();
  }

  downloadExperimentResults(): void {
    if (this.experimentResult === undefined || this.experimentResultConfig === undefined) return;

    const distribution = this.experimentResultConfig.sameX ? 'misma-x' : 'general';
    const strategyCount = this.experimentResultConfig.strategyIds.length;
    const fileName = `resultados-${distribution}-${strategyCount}-estrategias.csv`;
    const csv = serializeExperimentCsv(this.experimentResultConfig, this.experimentResult);

    downloadTextFile(fileName, csv);
  }

  formatPoint(point: Point): string {
    return `${point.id} (${point.x}, ${point.y})`;
  }

  formatDistance(distance: number): string {
    return distance.toFixed(8);
  }

  formatMilliseconds(milliseconds: number): string {
    return milliseconds.toFixed(4);
  }

  formatAverageCalculations(calculations: number): string {
    return calculations.toFixed(2);
  }

  private finishExperiment(worker: Worker | undefined, error?: string): void {
    worker?.terminate();
    clearTimeout(this.experimentInactivityTimer);
    this.experimentInactivityTimer = undefined;

    if (this.experimentWorker === worker) {
      this.experimentWorker = undefined;
    }

    this.isExperimentRunning = false;
    this.experimentError = error;
  }

  private resetExperimentInactivityTimer(worker: Worker): void {
    clearTimeout(this.experimentInactivityTimer);
    this.experimentInactivityTimer = setTimeout(() => {
      if (this.experimentWorker !== worker) return;

      this.finishExperiment(
        worker,
        'El estudio no ha respondido durante 30 segundos. Reinicia la página e inténtalo de nuevo.',
      );
      this.changeDetectorRef.markForCheck();
    }, 30_000);
  }

  private refreshPointPlot(): void {
    if (this.dataset === undefined) {
      this.pointPlot = undefined;
      return;
    }

    const exhaustiveExecution = this.strategyCheck?.executions.find(
      (execution) => execution.id === 'exhaustive',
    );

    this.pointPlot = createPointPlot(this.dataset.points, exhaustiveExecution?.result.closestPair);
  }
}
