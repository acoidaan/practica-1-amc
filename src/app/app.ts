import { ChangeDetectorRef, Component, HostListener, inject, OnDestroy } from '@angular/core';
import { downloadTextFile } from './browser/download-file';
import type {
  ExperimentWorkerRequest,
  ExperimentWorkerResponse,
} from './browser/experiment-worker-messages';
import type { AlgorithmCodeLine, AlgorithmCodeSnippet } from './core/algorithm-code';
import { getAlgorithmCodeSnippet } from './core/algorithm-code';
import type { AlgorithmTrace, AlgorithmTraceStep } from './core/algorithm-trace';
import { createAlgorithmTrace, MAX_VISUALIZATION_POINTS } from './core/algorithm-trace';
import { generatePoints } from './core/dataset-generator';
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
import type { Dataset, Point } from './core/models';
import type { PointPlot } from './core/point-plot';
import { createPointPlot, PLOT_HEIGHT, PLOT_WIDTH } from './core/point-plot';
import type { StrategyCheckResult, StrategyExecution } from './core/strategy-checker';
import { checkStrategies } from './core/strategy-checker';
import { STRATEGIES, type StrategyId } from './core/strategy-runner';
import { parseTsplib } from './core/tsplib-parser';
import { serializeTsplib } from './core/tsplib-writer';

interface VisualizationPlayer {
  readonly key: 'primary' | 'secondary';
  strategyId: StrategyId;
  trace: AlgorithmTrace | undefined;
  stepIndex: number;
  plot: PointPlot | undefined;
}

type PageSectionId =
  'inicio' | 'preparar-dataset' | 'dataset' | 'visualizador' | 'comprobacion' | 'experimento';

const TRACKED_SECTION_IDS: readonly PageSectionId[] = [
  'inicio',
  'preparar-dataset',
  'dataset',
  'visualizador',
  'comprobacion',
  'experimento',
];

function resolveInitialDarkTheme(): boolean {
  const storedTheme = localStorage.getItem('amc-theme');

  if (storedTheme === 'dark') return true;
  if (storedTheme === 'light') return false;

  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

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
  isDarkTheme = resolveInitialDarkTheme();
  isMenuOpen = false;
  activeSectionId: PageSectionId = 'inicio';

  strategyCheck: StrategyCheckResult | undefined = undefined;
  strategyCheckError: string | undefined = undefined;

  readonly maxVisualizationPoints = MAX_VISUALIZATION_POINTS;
  readonly visualizationPlayers: VisualizationPlayer[] = [
    {
      key: 'primary',
      strategyId: 'exhaustive',
      trace: undefined,
      stepIndex: -1,
      plot: undefined,
    },
    {
      key: 'secondary',
      strategyId: 'divide-conquer-improved',
      trace: undefined,
      stepIndex: -1,
      plot: undefined,
    },
  ];
  isVisualizationComparisonEnabled = false;
  visualizationSpeed = 8;
  visualizationError: string | undefined = undefined;
  isVisualizationPlaying = false;
  showVisualizationLabels = false;
  visualizationZoom = 1;
  visualizationCenterX = PLOT_WIDTH / 2;
  visualizationCenterY = PLOT_HEIGHT / 2;

  readonly experimentSizes = REQUIRED_EXPERIMENT_SIZES;
  readonly experimentRepetitions = DEFAULT_EXPERIMENT_REPETITIONS;
  readonly experimentStrategies = STRATEGIES.map(({ id, name }) => ({ id, name }));
  readonly allExperimentStrategyIds = this.experimentStrategies.map(({ id }) => id);

  selectedExperimentStrategyIds: StrategyId[] = [];
  experimentProgress: ExperimentProgress | undefined = undefined;
  experimentResult: ExperimentResult | undefined = undefined;
  experimentResultConfig: ExperimentConfig | undefined = undefined;
  experimentChart: ExperimentChart | undefined = undefined;
  experimentError: string | undefined = undefined;
  isExperimentRunning = false;

  private experimentWorker: Worker | undefined = undefined;
  private experimentInactivityTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  private visualizationTimer: ReturnType<typeof setTimeout> | undefined = undefined;

  get activeVisualizationPlayers(): readonly VisualizationPlayer[] {
    return this.isVisualizationComparisonEnabled
      ? this.visualizationPlayers
      : [this.visualizationPlayers[0]];
  }

  get visualizationViewBox(): string {
    const width = PLOT_WIDTH / this.visualizationZoom;
    const height = PLOT_HEIGHT / this.visualizationZoom;
    const minX = Math.min(PLOT_WIDTH - width, Math.max(0, this.visualizationCenterX - width / 2));
    const minY = Math.min(
      PLOT_HEIGHT - height,
      Math.max(0, this.visualizationCenterY - height / 2),
    );

    return `${minX} ${minY} ${width} ${height}`;
  }

  get isVisualizationComplete(): boolean {
    return (
      this.activeVisualizationPlayers.length > 0 &&
      this.activeVisualizationPlayers.every((player) => this.isPlayerComplete(player))
    );
  }

  get canCompareTwoStrategies(): boolean {
    return this.selectedExperimentStrategyIds.length === 2;
  }

  get hasStartedVisualization(): boolean {
    return this.visualizationPlayers.some((player) => player.trace !== undefined);
  }

  get experimentResultStrategies(): readonly StrategyAverage[] {
    return this.experimentResult?.rows[0]?.strategies ?? [];
  }

  ngOnDestroy(): void {
    this.experimentWorker?.terminate();
    clearTimeout(this.experimentInactivityTimer);
    clearTimeout(this.visualizationTimer);
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

  @HostListener('window:scroll')
  @HostListener('window:hashchange')
  updateActiveSection(): void {
    if (window.scrollY <= 1 && window.location.hash === '') {
      this.activeSectionId = 'inicio';
      return;
    }

    const activationOffset = 112;
    let activeSection: PageSectionId = 'inicio';

    for (const sectionId of TRACKED_SECTION_IDS) {
      const section = document.getElementById(sectionId);

      if (section !== null && section.getBoundingClientRect().top <= activationOffset) {
        activeSection = sectionId;
      }
    }

    this.activeSectionId = activeSection;
  }

  isSectionActive(...sectionIds: readonly PageSectionId[]): boolean {
    return sectionIds.includes(this.activeSectionId);
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file === undefined) return;

    this.loadError = undefined;
    this.generationError = undefined;
    this.clearStrategyCheck();
    this.clearVisualization();
    this.dataset = undefined;
    this.refreshPointPlot();

    try {
      const sourceText = await file.text();
      this.dataset = parseTsplib(file.name, sourceText);
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : 'Unable to load file';
    } finally {
      this.refreshPointPlot();
      this.changeDetectorRef.markForCheck();
    }
  }

  onGenerateDataset(event: Event, sizeText: string, sameX: boolean): void {
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
    this.clearVisualization();
    this.dataset = { fileName, points, sourceText };
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

  setVisualizationStrategy(playerKey: string, strategyId: string): void {
    const player = this.visualizationPlayers.find((candidate) => candidate.key === playerKey);

    if (
      player === undefined ||
      !this.experimentStrategies.some((strategy) => strategy.id === strategyId)
    ) {
      return;
    }

    this.pauseVisualization();
    player.strategyId = strategyId as StrategyId;
    player.trace = undefined;
    this.visualizationError = undefined;

    for (const activePlayer of this.activeVisualizationPlayers) {
      activePlayer.stepIndex = -1;
      this.updateVisualizationPlot(activePlayer);
    }
  }

  setVisualizationComparisonEnabled(enabled: boolean): void {
    this.pauseVisualization();
    this.isVisualizationComparisonEnabled = enabled;
    this.resetVisualization();
  }

  setVisualizationSpeed(speed: number): void {
    if (!Number.isFinite(speed)) return;

    this.visualizationSpeed = Math.min(120, Math.max(1, speed));

    if (this.isVisualizationPlaying) this.scheduleVisualizationStep();
  }

  setVisualizationLabelsVisible(visible: boolean): void {
    this.showVisualizationLabels = visible;
  }

  zoomVisualization(direction: 'in' | 'out'): void {
    const change = direction === 'in' ? 0.25 : -0.25;
    this.visualizationZoom = Math.min(3, Math.max(1, this.visualizationZoom + change));
    this.clampVisualizationCenter();
  }

  panVisualization(deltaX: number, deltaY: number): void {
    const step = 45 / this.visualizationZoom;
    this.visualizationCenterX += deltaX * step;
    this.visualizationCenterY += deltaY * step;
    this.clampVisualizationCenter();
  }

  resetVisualizationViewport(): void {
    this.visualizationZoom = 1;
    this.visualizationCenterX = PLOT_WIDTH / 2;
    this.visualizationCenterY = PLOT_HEIGHT / 2;
  }

  toggleVisualization(): void {
    if (this.isVisualizationPlaying) {
      this.pauseVisualization();
      return;
    }

    if (!this.ensureActiveVisualizationTraces()) return;

    if (this.isVisualizationComplete) this.resetVisualization();

    this.isVisualizationPlaying = true;
    this.advanceVisualization();
  }

  pauseVisualization(): void {
    this.isVisualizationPlaying = false;
    clearTimeout(this.visualizationTimer);
    this.visualizationTimer = undefined;
  }

  stepVisualization(): void {
    this.pauseVisualization();

    if (!this.ensureActiveVisualizationTraces() || this.isVisualizationComplete) return;

    this.advanceActivePlayers();
  }

  resetVisualization(): void {
    this.pauseVisualization();

    for (const player of this.activeVisualizationPlayers) {
      player.stepIndex = -1;
      this.updateVisualizationPlot(player);
    }
  }

  currentVisualizationStep(player: VisualizationPlayer): AlgorithmTraceStep | undefined {
    return player.trace?.steps[player.stepIndex];
  }

  visualizationProgressValue(player: VisualizationPlayer): number {
    return Math.max(0, player.stepIndex + 1);
  }

  isPlayerComplete(player: VisualizationPlayer): boolean {
    return player.trace !== undefined && player.stepIndex >= player.trace.steps.length - 1;
  }

  algorithmCodeSnippet(player: VisualizationPlayer): AlgorithmCodeSnippet {
    return getAlgorithmCodeSnippet(player.strategyId);
  }

  isCodeLineActive(player: VisualizationPlayer, line: AlgorithmCodeLine): boolean {
    const phase = this.currentVisualizationStep(player)?.phase;

    if (phase === undefined) return false;

    const activeLine = this.algorithmCodeSnippet(player).lines.find((candidate) =>
      candidate.phases.includes(phase),
    );

    return activeLine?.number === line.number;
  }

  describeVisualizationStep(step: AlgorithmTraceStep): string {
    if (step.phase === 'sort-x') return 'Se ordenan los puntos por la coordenada x.';
    if (step.phase === 'sort-y') return 'Se prepara una segunda vista ordenada por y.';
    if (step.phase === 'initialize') return 'Se inicializa la mejor pareja conocida.';
    if (step.phase === 'scan') return 'Comienza el recorrido sistemático de parejas.';
    if (step.phase === 'divide') {
      return `Se divide el subproblema en el nivel recursivo ${step.depth ?? 0}.`;
    }
    if (step.phase === 'base-case') {
      return `Caso base con ${step.activePoints.length} puntos en el nivel ${step.depth ?? 0}.`;
    }
    if (step.phase === 'combine') {
      return `Se combinan las dos mitades con δ = ${this.formatDistance(step.delta ?? 0)}.`;
    }
    if (step.phase === 'build-strip') {
      return `Se construye la franja de anchura 2δ con ${step.activePoints.length} puntos.`;
    }
    if (step.type === 'comparison' && step.first && step.second) {
      return `Se calcula la distancia entre los puntos ${step.first.id} y ${step.second.id}.`;
    }
    if (step.type === 'best' && step.first && step.second) {
      return `La pareja ${step.first.id}–${step.second.id} pasa a ser la mejor conocida.`;
    }
    if (step.type === 'prune' && step.first && step.second) {
      const axis = step.pruneReason === 'vertical' ? 'vertical' : 'horizontal';
      return `La separación ${axis} permite podar desde la pareja ${step.first.id}–${step.second.id}.`;
    }
    if (step.first && step.second) {
      return `Ejecución terminada: la pareja mínima es ${step.first.id}–${step.second.id}.`;
    }

    return 'La estrategia avanza a la siguiente fase.';
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

    const request: ExperimentWorkerRequest = { type: 'start', config };
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

  private clearStrategyCheck(): void {
    this.strategyCheck = undefined;
    this.strategyCheckError = undefined;
  }

  private ensureActiveVisualizationTraces(): boolean {
    if (this.dataset === undefined) {
      this.visualizationError = 'Carga o genera un dataset antes de iniciar la visualización.';
      return false;
    }

    try {
      for (const player of this.activeVisualizationPlayers) {
        if (player.trace !== undefined) continue;

        player.trace = createAlgorithmTrace(player.strategyId, this.dataset.points);
        player.stepIndex = -1;
        this.updateVisualizationPlot(player);
      }

      this.visualizationError = undefined;
      return true;
    } catch (error) {
      if (error instanceof RangeError && this.dataset.points.length > MAX_VISUALIZATION_POINTS) {
        this.visualizationError =
          `La animación admite hasta ${MAX_VISUALIZATION_POINTS} puntos para evitar millones de pasos. ` +
          'Usa un dataset pequeño; la comprobación y el estudio experimental siguen sin este límite.';
      } else if (error instanceof RangeError) {
        this.visualizationError = 'Se necesitan al menos dos puntos para visualizar una ejecución.';
      } else if (error instanceof Error) {
        this.visualizationError = `No se pudo crear la visualización: ${error.message}`;
      } else {
        this.visualizationError = 'No se pudo crear la visualización.';
      }

      return false;
    }
  }

  private advanceVisualization(): void {
    if (!this.isVisualizationPlaying) return;

    this.advanceActivePlayers();
    this.changeDetectorRef.markForCheck();

    if (this.isVisualizationComplete) {
      this.pauseVisualization();
      return;
    }

    this.scheduleVisualizationStep();
  }

  private advanceActivePlayers(): void {
    for (const player of this.activeVisualizationPlayers) {
      if (player.trace === undefined || this.isPlayerComplete(player)) continue;

      player.stepIndex++;
      this.updateVisualizationPlot(player);
    }
  }

  private scheduleVisualizationStep(): void {
    clearTimeout(this.visualizationTimer);
    if (!this.isVisualizationPlaying) return;

    this.visualizationTimer = setTimeout(
      () => this.advanceVisualization(),
      1000 / this.visualizationSpeed,
    );
  }

  private updateVisualizationPlot(player: VisualizationPlayer): void {
    if (this.dataset === undefined) {
      player.plot = undefined;
      return;
    }

    const step = this.currentVisualizationStep(player);
    const activeConnection =
      (step?.type === 'comparison' || step?.type === 'prune') && step.first && step.second
        ? { first: step.first, second: step.second }
        : undefined;

    player.plot = createPointPlot(this.dataset.points, step?.bestPair, activeConnection, {
      activePoints: step?.activePoints,
      dividerX: step?.dividerX,
      delta: step?.delta,
    });
  }

  private clearVisualization(): void {
    this.pauseVisualization();

    for (const player of this.visualizationPlayers) {
      player.trace = undefined;
      player.stepIndex = -1;
      player.plot = undefined;
    }

    this.visualizationError = undefined;
    this.resetVisualizationViewport();
  }

  private clampVisualizationCenter(): void {
    const halfWidth = PLOT_WIDTH / this.visualizationZoom / 2;
    const halfHeight = PLOT_HEIGHT / this.visualizationZoom / 2;
    this.visualizationCenterX = Math.min(
      PLOT_WIDTH - halfWidth,
      Math.max(halfWidth, this.visualizationCenterX),
    );
    this.visualizationCenterY = Math.min(
      PLOT_HEIGHT - halfHeight,
      Math.max(halfHeight, this.visualizationCenterY),
    );
  }

  private finishExperiment(worker: Worker | undefined, error?: string): void {
    worker?.terminate();
    clearTimeout(this.experimentInactivityTimer);
    this.experimentInactivityTimer = undefined;

    if (this.experimentWorker === worker) this.experimentWorker = undefined;

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
      for (const player of this.visualizationPlayers) player.plot = undefined;
      return;
    }

    const exhaustiveExecution = this.strategyCheck?.executions.find(
      (execution) => execution.id === 'exhaustive',
    );

    this.pointPlot = createPointPlot(this.dataset.points, exhaustiveExecution?.result.closestPair);

    for (const player of this.visualizationPlayers) {
      if (player.trace === undefined) player.plot = this.pointPlot;
    }
  }
}
