import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { downloadTextFile } from '../../browser/download-file';
import { createFiniteAutomaton } from './core/automata';
import { AutomatonParseError, parseAutomaton } from './core/automaton-parser';
import type {
  AutomatonProcess,
  InputSymbol,
  SimulationStep,
  SimulationTrace,
  StateId,
} from './core/models';
import { formatSymbolLiteral } from './core/symbol-literal';

const AFD_EXAMPLE = `TIPO: AFD
ESTADOS: q0 q1 q2 q3
INICIAL: q0
FINALES: q2 q3
TRANSICIONES:
q0 '0' q1
q0 '1' q2
q1 '1' q3
q2 '0' q1
FIN`;

const AFND_EXAMPLE = `TIPO: AFND
ESTADOS: q0 q1 q2 q3
INICIAL: q0
FINALES: q2 q3
TRANSICIONES:
q0 '0' q1
q0 '1' q2 q3
q1 '1' q0 q2 q3
q2 '0' q1
TRANSICIONES LAMBDA:
q0 q1
q3 q0 q2
FIN`;

type ExampleType = 'AFD' | 'AFND';
type SimulationMode = 'full' | 'step';

/** Complete browser coordinator for loading, validating and simulating Practice 2 automata. */
@Component({
  selector: 'app-practice-two-page',
  imports: [FormsModule, RouterLink],
  styleUrl: './practice-two-page.css',
  templateUrl: './practice-two-page.html',
})
export class PracticeTwoPage {
  sourceText = AFD_EXAMPLE;
  sourceName = 'Ejemplo AFD';
  isSourceDirty = false;
  parseError: string | undefined = undefined;
  automaton: AutomatonProcess | undefined = createFiniteAutomaton(parseAutomaton(AFD_EXAMPLE));

  inputText = '';
  trace: SimulationTrace | undefined = undefined;
  simulationMode: SimulationMode = 'full';
  visibleStepIndex = -1;

  get alphabet(): readonly InputSymbol[] {
    return [
      ...new Set(this.automaton?.definition.transitions.map(({ symbol }) => symbol) ?? []),
    ];
  }

  get currentStep(): SimulationStep | undefined {
    return this.trace?.steps[this.visibleStepIndex];
  }

  get visibleSteps(): readonly SimulationStep[] {
    if (this.trace === undefined || this.visibleStepIndex < 0) return [];
    return this.trace.steps.slice(0, this.visibleStepIndex + 1);
  }

  get isSimulationComplete(): boolean {
    return (
      this.trace !== undefined &&
      this.visibleStepIndex === this.trace.steps.length - 1
    );
  }

  get canAdvance(): boolean {
    return this.trace !== undefined && this.visibleStepIndex < this.trace.steps.length - 1;
  }

  get canGoBack(): boolean {
    return this.trace !== undefined && this.visibleStepIndex > 0;
  }

  onSourceChanged(sourceText: string): void {
    this.sourceText = sourceText;
    this.sourceName = 'Entrada manual';
    this.isSourceDirty = true;
    this.parseError = undefined;
  }

  loadExample(type: ExampleType): void {
    this.sourceText = type === 'AFD' ? AFD_EXAMPLE : AFND_EXAMPLE;
    this.sourceName = `Ejemplo ${type}`;
    this.buildAutomaton();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file === undefined) return;

    try {
      this.sourceText = await file.text();
      this.sourceName = file.name;
      this.buildAutomaton();
    } catch {
      this.parseError = `No se pudo leer el fichero ${file.name}.`;
    } finally {
      input.value = '';
    }
  }

  buildAutomaton(): void {
    try {
      const definition = parseAutomaton(this.sourceText);
      this.automaton = createFiniteAutomaton(definition);
      this.parseError = undefined;
      this.isSourceDirty = false;
      this.clearSimulation();
    } catch (error) {
      this.parseError =
        error instanceof AutomatonParseError || error instanceof Error
          ? error.message
          : 'No se pudo interpretar el autómata.';
    }
  }

  downloadAutomaton(): void {
    if (this.automaton === undefined) return;
    const suffix = this.automaton.definition.type.toLowerCase();
    downloadTextFile(`automata-${suffix}.txt`, this.automaton.toString());
  }

  simulateAll(): void {
    if (this.automaton === undefined) return;
    this.trace = this.automaton.simulate(this.inputText);
    this.simulationMode = 'full';
    this.visibleStepIndex = this.trace.steps.length - 1;
  }

  startStepSimulation(): void {
    if (this.automaton === undefined) return;
    this.trace = this.automaton.simulate(this.inputText);
    this.simulationMode = 'step';
    this.visibleStepIndex = 0;
  }

  nextStep(): void {
    if (this.canAdvance) this.visibleStepIndex += 1;
  }

  previousStep(): void {
    if (this.canGoBack) this.visibleStepIndex -= 1;
  }

  restartSimulation(): void {
    if (this.trace !== undefined) this.visibleStepIndex = 0;
  }

  clearSimulation(): void {
    this.trace = undefined;
    this.visibleStepIndex = -1;
  }

  isSymbolTransitionActive(id: string): boolean {
    return this.currentStep?.transitionIds.includes(id) ?? false;
  }

  isLambdaTransitionActive(id: string): boolean {
    return this.currentStep?.lambdaTransitionIds.includes(id) ?? false;
  }

  formatStates(states: readonly StateId[]): string {
    if (states.length === 0) return '∅';
    if (this.automaton?.definition.type === 'AFD' && states.length === 1) return states[0];
    return `{ ${states.join(', ')} }`;
  }

  formatSymbol(symbol: InputSymbol | null): string {
    return symbol === null ? 'Inicio' : formatSymbolLiteral(symbol);
  }

  stepDescription(step: SimulationStep): string {
    if (step.symbol === null) {
      return this.automaton?.definition.type === 'AFND'
        ? 'Clausura lambda del estado inicial'
        : 'Estado inicial';
    }
    return `Consumir ${formatSymbolLiteral(step.symbol)}`;
  }
}
