import type {
  AutomatonDefinition,
  LambdaTransition,
  NormalizedAutomatonDefinition,
  StateId,
  SymbolTransition,
} from './models';

const STATE_ID_PATTERN = /^[A-Za-z0-9]+$/;

/** Aggregates all definition problems so the form can present them together. */
export class AutomatonValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(issues.join('\n'));
    this.name = 'AutomatonValidationError';
  }
}

function duplicateValues(values: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

/** Returns every semantic problem found in an automaton definition. */
export function validateAutomatonDefinition(definition: AutomatonDefinition): readonly string[] {
  const issues: string[] = [];

  if (definition.type !== 'AFD' && definition.type !== 'AFND') {
    issues.push(`Tipo de autómata desconocido: ${String(definition.type)}.`);
  }

  if (definition.states.length === 0) {
    issues.push('El autómata debe declarar al menos un estado.');
  }

  for (const state of definition.states) {
    if (!STATE_ID_PATTERN.test(state)) {
      issues.push(`El identificador de estado ${JSON.stringify(state)} no es alfanumérico.`);
    }
  }

  for (const state of duplicateValues(definition.states)) {
    issues.push(`El estado ${state} está declarado más de una vez.`);
  }

  const knownStates = new Set(definition.states);
  if (!knownStates.has(definition.initialState)) {
    issues.push(`El estado inicial ${definition.initialState || '(vacío)'} no está declarado.`);
  }

  for (const state of definition.finalStates) {
    if (!knownStates.has(state)) issues.push(`El estado final ${state} no está declarado.`);
  }
  for (const state of duplicateValues(definition.finalStates)) {
    issues.push(`El estado final ${state} aparece más de una vez.`);
  }

  const deterministicKeys = new Set<string>();
  for (const transition of definition.transitions) {
    if (!knownStates.has(transition.from)) {
      issues.push(`La transición usa el origen no declarado ${transition.from}.`);
    }
    if ([...transition.symbol].length !== 1) {
      issues.push(`La transición desde ${transition.from} debe consumir exactamente un símbolo.`);
    }
    if (transition.to.length === 0) {
      issues.push(`La transición desde ${transition.from} con ${JSON.stringify(transition.symbol)} no tiene destino.`);
    }
    for (const destination of transition.to) {
      if (!knownStates.has(destination)) {
        issues.push(`La transición desde ${transition.from} usa el destino no declarado ${destination}.`);
      }
    }

    if (definition.type === 'AFD') {
      if (transition.to.length !== 1) {
        issues.push(`Un AFD necesita exactamente un destino desde ${transition.from} con ${JSON.stringify(transition.symbol)}.`);
      }
      const key = `${transition.from}\u0000${transition.symbol}`;
      if (deterministicKeys.has(key)) {
        issues.push(`El AFD declara más de una transición desde ${transition.from} con ${JSON.stringify(transition.symbol)}.`);
      }
      deterministicKeys.add(key);
    }
  }

  if (definition.type === 'AFD' && definition.lambdaTransitions.length > 0) {
    issues.push('Un AFD no puede contener transiciones lambda.');
  }

  for (const transition of definition.lambdaTransitions) {
    if (!knownStates.has(transition.from)) {
      issues.push(`La transición lambda usa el origen no declarado ${transition.from}.`);
    }
    if (transition.to.length === 0) {
      issues.push(`La transición lambda desde ${transition.from} no tiene destino.`);
    }
    for (const destination of transition.to) {
      if (!knownStates.has(destination)) {
        issues.push(`La transición lambda desde ${transition.from} usa el destino no declarado ${destination}.`);
      }
    }
  }

  return issues;
}

function uniqueKnownStates(values: readonly StateId[], stateOrder: ReadonlyMap<StateId, number>): StateId[] {
  return [...new Set(values)].sort(
    (left, right) => (stateOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (stateOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Validates and normalizes duplicate AFND destinations into immutable indexed rows. */
export function normalizeAutomatonDefinition(
  definition: AutomatonDefinition,
): NormalizedAutomatonDefinition {
  const issues = validateAutomatonDefinition(definition);
  if (issues.length > 0) throw new AutomatonValidationError(issues);

  const stateOrder = new Map(definition.states.map((state, index) => [state, index]));
  const groupedTransitions = new Map<string, { from: StateId; symbol: string; to: StateId[] }>();

  for (const transition of definition.transitions) {
    const key = `${transition.from}\u0000${transition.symbol}`;
    const existing = groupedTransitions.get(key);
    if (existing === undefined) {
      groupedTransitions.set(key, {
        from: transition.from,
        symbol: transition.symbol,
        to: [...transition.to],
      });
    } else {
      existing.to.push(...transition.to);
    }
  }

  const transitions: SymbolTransition[] = [...groupedTransitions.values()].map(
    (transition, index) => ({
      id: `t${index}`,
      from: transition.from,
      symbol: transition.symbol,
      to: uniqueKnownStates(transition.to, stateOrder),
    }),
  );

  const groupedLambdaTransitions = new Map<StateId, StateId[]>();
  for (const transition of definition.lambdaTransitions) {
    const destinations = groupedLambdaTransitions.get(transition.from) ?? [];
    destinations.push(...transition.to);
    groupedLambdaTransitions.set(transition.from, destinations);
  }

  const lambdaTransitions: LambdaTransition[] = [...groupedLambdaTransitions].map(
    ([from, destinations], index) => ({
      id: `l${index}`,
      from,
      to: uniqueKnownStates(destinations, stateOrder),
    }),
  );

  return {
    type: definition.type,
    states: [...definition.states],
    initialState: definition.initialState,
    finalStates: uniqueKnownStates(definition.finalStates, stateOrder),
    transitions,
    lambdaTransitions,
  };
}
