import type {
  AutomatonDefinition,
  AutomatonProcess,
  InputSymbol,
  LambdaTransition,
  NormalizedAutomatonDefinition,
  SimulationStep,
  SimulationTrace,
  StateId,
  SymbolTransition,
} from './models';
import { normalizeAutomatonDefinition } from './automaton-validation';
import { formatSymbolLiteral } from './symbol-literal';

function appendToNestedIndex<T>(
  index: Map<StateId, Map<InputSymbol, T>>,
  state: StateId,
  symbol: InputSymbol,
  value: T,
): void {
  const bySymbol = index.get(state) ?? new Map<InputSymbol, T>();
  bySymbol.set(symbol, value);
  index.set(state, bySymbol);
}

abstract class BaseFiniteAutomaton implements AutomatonProcess {
  readonly definition: NormalizedAutomatonDefinition;
  protected readonly finalStates: ReadonlySet<StateId>;
  private readonly stateOrder: ReadonlyMap<StateId, number>;

  protected constructor(definition: AutomatonDefinition) {
    this.definition = normalizeAutomatonDefinition(definition);
    this.finalStates = new Set(this.definition.finalStates);
    this.stateOrder = new Map(this.definition.states.map((state, index) => [state, index]));
  }

  isFinalState(state: StateId): boolean {
    return this.finalStates.has(state);
  }

  recognize(input: string): boolean {
    return this.simulate(input).accepted;
  }

  abstract simulate(input: string): SimulationTrace;

  toString(): string {
    const lines = [
      `TIPO: ${this.definition.type}`,
      `ESTADOS: ${this.definition.states.join(' ')}`,
      `INICIAL: ${this.definition.initialState}`,
      `FINALES: ${this.definition.finalStates.join(' ')}`,
      'TRANSICIONES:',
      ...this.definition.transitions.map(
        ({ from, symbol, to }) => `${from} ${formatSymbolLiteral(symbol)} ${to.join(' ')}`,
      ),
    ];

    if (this.definition.type === 'AFND' && this.definition.lambdaTransitions.length > 0) {
      lines.push(
        'TRANSICIONES LAMBDA:',
        ...this.definition.lambdaTransitions.map(({ from, to }) => `${from} ${to.join(' ')}`),
      );
    }

    lines.push('FIN');
    return lines.join('\n');
  }

  protected orderStates(states: Iterable<StateId>): readonly StateId[] {
    return [...new Set(states)].sort(
      (left, right) =>
        (this.stateOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (this.stateOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  protected createTrace(input: string, steps: readonly SimulationStep[]): SimulationTrace {
    const finalConfiguration = steps.at(-1)?.afterStates ?? [];
    return {
      automatonType: this.definition.type,
      input,
      steps,
      finalStates: finalConfiguration,
      accepted: finalConfiguration.some((state) => this.isFinalState(state)),
    };
  }
}

/** Deterministic finite automaton with an implicit dead state represented by the empty set. */
export class DeterministicFiniteAutomaton extends BaseFiniteAutomaton {
  private readonly transitionIndex = new Map<
    StateId,
    Map<InputSymbol, SymbolTransition>
  >();

  constructor(definition: AutomatonDefinition) {
    super(definition);
    if (this.definition.type !== 'AFD') {
      throw new Error('DeterministicFiniteAutomaton necesita una definición de tipo AFD.');
    }

    for (const transition of this.definition.transitions) {
      appendToNestedIndex(this.transitionIndex, transition.from, transition.symbol, transition);
    }
  }

  simulate(input: string): SimulationTrace {
    const steps: SimulationStep[] = [
      {
        stepNumber: 0,
        inputIndex: null,
        symbol: null,
        beforeStates: [],
        directStates: [this.definition.initialState],
        afterStates: [this.definition.initialState],
        transitionIds: [],
        lambdaTransitionIds: [],
      },
    ];

    let currentState: StateId | undefined = this.definition.initialState;
    for (const [inputIndex, symbol] of [...input].entries()) {
      const beforeStates = currentState === undefined ? [] : [currentState];
      const transition: SymbolTransition | undefined =
        currentState === undefined ? undefined : this.transitionIndex.get(currentState)?.get(symbol);
      currentState = transition?.to[0];
      const afterStates = currentState === undefined ? [] : [currentState];

      steps.push({
        stepNumber: steps.length,
        inputIndex,
        symbol,
        beforeStates,
        directStates: afterStates,
        afterStates,
        transitionIds: transition === undefined ? [] : [transition.id],
        lambdaTransitionIds: [],
      });
    }

    return this.createTrace(input, steps);
  }
}

interface LambdaClosureResult {
  readonly states: readonly StateId[];
  readonly transitionIds: readonly string[];
}

/** Non-deterministic finite automaton simulated through macro-states and lambda closures. */
export class NondeterministicFiniteAutomaton extends BaseFiniteAutomaton {
  private readonly transitionIndex = new Map<
    StateId,
    Map<InputSymbol, SymbolTransition>
  >();
  private readonly lambdaIndex = new Map<StateId, LambdaTransition>();

  constructor(definition: AutomatonDefinition) {
    super(definition);
    if (this.definition.type !== 'AFND') {
      throw new Error('NondeterministicFiniteAutomaton necesita una definición de tipo AFND.');
    }

    for (const transition of this.definition.transitions) {
      appendToNestedIndex(this.transitionIndex, transition.from, transition.symbol, transition);
    }
    for (const transition of this.definition.lambdaTransitions) {
      this.lambdaIndex.set(transition.from, transition);
    }
  }

  lambdaClosure(states: Iterable<StateId>): readonly StateId[] {
    return this.calculateLambdaClosure(states).states;
  }

  simulate(input: string): SimulationTrace {
    const initialClosure = this.calculateLambdaClosure([this.definition.initialState]);
    const steps: SimulationStep[] = [
      {
        stepNumber: 0,
        inputIndex: null,
        symbol: null,
        beforeStates: [],
        directStates: [this.definition.initialState],
        afterStates: initialClosure.states,
        transitionIds: [],
        lambdaTransitionIds: initialClosure.transitionIds,
      },
    ];

    let currentStates = initialClosure.states;
    for (const [inputIndex, symbol] of [...input].entries()) {
      const directDestinations = new Set<StateId>();
      const transitionIds: string[] = [];

      for (const state of currentStates) {
        const transition = this.transitionIndex.get(state)?.get(symbol);
        if (transition === undefined) continue;
        transitionIds.push(transition.id);
        for (const destination of transition.to) directDestinations.add(destination);
      }

      const orderedDirectStates = this.orderStates(directDestinations);
      const closure = this.calculateLambdaClosure(orderedDirectStates);
      steps.push({
        stepNumber: steps.length,
        inputIndex,
        symbol,
        beforeStates: currentStates,
        directStates: orderedDirectStates,
        afterStates: closure.states,
        transitionIds,
        lambdaTransitionIds: closure.transitionIds,
      });
      currentStates = closure.states;
    }

    return this.createTrace(input, steps);
  }

  private calculateLambdaClosure(states: Iterable<StateId>): LambdaClosureResult {
    const visited = new Set(states);
    const pending = [...visited];
    const transitionIds: string[] = [];

    while (pending.length > 0) {
      const state = pending.shift();
      if (state === undefined) break;
      const transition = this.lambdaIndex.get(state);
      if (transition === undefined) continue;

      transitionIds.push(transition.id);
      for (const destination of transition.to) {
        if (visited.has(destination)) continue;
        visited.add(destination);
        pending.push(destination);
      }
    }

    return {
      states: this.orderStates(visited),
      transitionIds,
    };
  }
}

/** Builds the correct simulator after validating the declared automaton type. */
export function createFiniteAutomaton(definition: AutomatonDefinition): AutomatonProcess {
  return definition.type === 'AFD'
    ? new DeterministicFiniteAutomaton(definition)
    : new NondeterministicFiniteAutomaton(definition);
}
