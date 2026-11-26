/** Supported finite-automaton variants from the assignment input format. */
export type AutomatonType = 'AFD' | 'AFND';

/** State identifiers are validated as non-empty alphanumeric literals. */
export type StateId = string;

/** An input symbol is stored decoded, never with its source-file quotes. */
export type InputSymbol = string;

/** Transition that consumes one symbol and may reach one or more states. */
export interface SymbolTransitionDefinition {
  readonly from: StateId;
  readonly symbol: InputSymbol;
  readonly to: readonly StateId[];
}

/** Transition that consumes no symbol. Only valid for an AFND. */
export interface LambdaTransitionDefinition {
  readonly from: StateId;
  readonly to: readonly StateId[];
}

/** Serializable automaton definition shared by the parser and manual editor. */
export interface AutomatonDefinition {
  readonly type: AutomatonType;
  readonly states: readonly StateId[];
  readonly initialState: StateId;
  readonly finalStates: readonly StateId[];
  readonly transitions: readonly SymbolTransitionDefinition[];
  readonly lambdaTransitions: readonly LambdaTransitionDefinition[];
}

/** Normalized symbol transition with a stable identifier for later SVG highlighting. */
export interface SymbolTransition extends SymbolTransitionDefinition {
  readonly id: string;
}

/** Normalized lambda transition with a stable identifier for later SVG highlighting. */
export interface LambdaTransition extends LambdaTransitionDefinition {
  readonly id: string;
}

/** Immutable validated definition consumed by both simulators. */
export interface NormalizedAutomatonDefinition
  extends Omit<AutomatonDefinition, 'transitions' | 'lambdaTransitions'> {
  readonly transitions: readonly SymbolTransition[];
  readonly lambdaTransitions: readonly LambdaTransition[];
}

/** One initial configuration or one input-symbol transition in a simulation trace. */
export interface SimulationStep {
  readonly stepNumber: number;
  readonly inputIndex: number | null;
  readonly symbol: InputSymbol | null;
  readonly beforeStates: readonly StateId[];
  readonly directStates: readonly StateId[];
  readonly afterStates: readonly StateId[];
  readonly transitionIds: readonly string[];
  readonly lambdaTransitionIds: readonly string[];
}

/** Complete deterministic result used by both full and step-by-step presentation. */
export interface SimulationTrace {
  readonly automatonType: AutomatonType;
  readonly input: string;
  readonly steps: readonly SimulationStep[];
  readonly finalStates: readonly StateId[];
  readonly accepted: boolean;
}

/** Common process contract requested by the assignment, generalized for macro-states. */
export interface AutomatonProcess {
  readonly definition: NormalizedAutomatonDefinition;
  isFinalState(state: StateId): boolean;
  recognize(input: string): boolean;
  simulate(input: string): SimulationTrace;
  toString(): string;
}
