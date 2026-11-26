import {
  createFiniteAutomaton,
  DeterministicFiniteAutomaton,
  NondeterministicFiniteAutomaton,
} from './automata';
import { AutomatonValidationError, normalizeAutomatonDefinition } from './automaton-validation';
import type { AutomatonDefinition } from './models';

const afdDefinition: AutomatonDefinition = {
  type: 'AFD',
  states: ['start', 'middle', 'final'],
  initialState: 'start',
  finalStates: ['final'],
  transitions: [
    { from: 'start', symbol: 'a', to: ['middle'] },
    { from: 'middle', symbol: 'b', to: ['final'] },
  ],
  lambdaTransitions: [],
};

it('simulates an AFD and records one trace step per symbol', () => {
  const automaton = new DeterministicFiniteAutomaton(afdDefinition);
  const trace = automaton.simulate('ab');

  expect(trace.accepted).toBe(true);
  expect(trace.finalStates).toEqual(['final']);
  expect(trace.steps).toHaveLength(3);
  expect(trace.steps.map(({ afterStates }) => afterStates)).toEqual([
    ['start'],
    ['middle'],
    ['final'],
  ]);
  expect(trace.steps[1].transitionIds).toEqual(['t0']);
  expect(trace.steps[2].transitionIds).toEqual(['t1']);
  expect(automaton.recognize('ab')).toBe(true);
  expect(automaton.recognize('a')).toBe(false);
});

it('represents a missing AFD transition as an implicit dead state', () => {
  const trace = new DeterministicFiniteAutomaton(afdDefinition).simulate('aaab');

  expect(trace.steps[2].beforeStates).toEqual(['middle']);
  expect(trace.steps[2].afterStates).toEqual([]);
  expect(trace.steps[3].afterStates).toEqual([]);
  expect(trace.steps[4].afterStates).toEqual([]);
  expect(trace.accepted).toBe(false);
});

it('handles the empty input using the configurable initial state', () => {
  const definition: AutomatonDefinition = {
    ...afdDefinition,
    initialState: 'final',
  };
  const trace = createFiniteAutomaton(definition).simulate('');

  expect(trace.steps).toHaveLength(1);
  expect(trace.finalStates).toEqual(['final']);
  expect(trace.accepted).toBe(true);
});

it('computes transitive lambda closures and terminates on cycles', () => {
  const definition: AutomatonDefinition = {
    type: 'AFND',
    states: ['q0', 'q1', 'q2', 'q3'],
    initialState: 'q0',
    finalStates: ['q3'],
    transitions: [{ from: 'q2', symbol: 'a', to: ['q2', 'q3'] }],
    lambdaTransitions: [
      { from: 'q0', to: ['q1'] },
      { from: 'q1', to: ['q2'] },
      { from: 'q2', to: ['q0'] },
    ],
  };
  const automaton = new NondeterministicFiniteAutomaton(definition);

  expect(automaton.lambdaClosure(['q0'])).toEqual(['q0', 'q1', 'q2']);
  const trace = automaton.simulate('a');
  expect(trace.steps[0].afterStates).toEqual(['q0', 'q1', 'q2']);
  expect(trace.steps[0].lambdaTransitionIds).toEqual(['l0', 'l1', 'l2']);
  expect(trace.steps[1].directStates).toEqual(['q2', 'q3']);
  expect(trace.steps[1].afterStates).toEqual(['q0', 'q1', 'q2', 'q3']);
  expect(trace.accepted).toBe(true);
});

it('accepts the empty input when the initial lambda closure reaches a final state', () => {
  const definition: AutomatonDefinition = {
    type: 'AFND',
    states: ['s', 'accept'],
    initialState: 's',
    finalStates: ['accept'],
    transitions: [],
    lambdaTransitions: [{ from: 's', to: ['accept'] }],
  };

  expect(new NondeterministicFiniteAutomaton(definition).recognize('')).toBe(true);
});

it('unions all AFND destinations and rejects after reaching the empty macro-state', () => {
  const definition: AutomatonDefinition = {
    type: 'AFND',
    states: ['q0', 'q1', 'q2'],
    initialState: 'q0',
    finalStates: ['q2'],
    transitions: [
      { from: 'q0', symbol: 'a', to: ['q1'] },
      { from: 'q0', symbol: 'a', to: ['q2', 'q1'] },
    ],
    lambdaTransitions: [],
  };
  const automaton = new NondeterministicFiniteAutomaton(definition);

  expect(automaton.definition.transitions).toHaveLength(1);
  expect(automaton.definition.transitions[0].to).toEqual(['q1', 'q2']);
  expect(automaton.simulate('a').accepted).toBe(true);
  const rejected = automaton.simulate('ab');
  expect(rejected.steps[2].afterStates).toEqual([]);
  expect(rejected.accepted).toBe(false);
});

it('serializes normalized AFD and AFND definitions in the official format', () => {
  expect(new DeterministicFiniteAutomaton(afdDefinition).toString()).toContain(
    "start 'a' middle",
  );

  const afnd = new NondeterministicFiniteAutomaton({
    type: 'AFND',
    states: ['q0', 'q1'],
    initialState: 'q0',
    finalStates: [],
    transitions: [],
    lambdaTransitions: [{ from: 'q0', to: ['q1'] }],
  });
  expect(afnd.toString()).toContain('TRANSICIONES LAMBDA:\nq0 q1\nFIN');
});

it('reports all important validation errors before simulation', () => {
  const invalid: AutomatonDefinition = {
    type: 'AFD',
    states: ['q0', 'q0', 'bad-state'],
    initialState: 'missing',
    finalStates: ['final'],
    transitions: [
      { from: 'q0', symbol: 'ab', to: ['missing', 'q0'] },
      { from: 'q0', symbol: 'ab', to: ['q0'] },
    ],
    lambdaTransitions: [{ from: 'q0', to: ['q0'] }],
  };

  expect(() => normalizeAutomatonDefinition(invalid)).toThrow(AutomatonValidationError);
  try {
    normalizeAutomatonDefinition(invalid);
  } catch (error) {
    expect(error).toBeInstanceOf(AutomatonValidationError);
    const issues = (error as AutomatonValidationError).issues.join('\n');
    expect(issues).toContain('bad-state');
    expect(issues).toContain('más de una vez');
    expect(issues).toContain('estado inicial missing');
    expect(issues).toContain('exactamente un símbolo');
    expect(issues).toContain('exactamente un destino');
    expect(issues).toContain('transiciones lambda');
  }
});
