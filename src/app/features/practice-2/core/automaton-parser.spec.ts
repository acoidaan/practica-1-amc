import { createFiniteAutomaton } from './automata';
import { AutomatonParseError, parseAutomaton } from './automaton-parser';

const officialAfd = `TIPO: AFD
ESTADOS: q0 q1 q2 q3
INICIAL: q0
FINALES: q2 q3
TRANSICIONES:
q0 '0' q1
q0 '1' q2
q1 '1' q3
q2 '0' q1
FIN`;

const officialAfnd = `TIPO: AFND
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

it('parses the official AFD example and simulates it', () => {
  const definition = parseAutomaton(officialAfd);

  expect(definition.type).toBe('AFD');
  expect(definition.states).toEqual(['q0', 'q1', 'q2', 'q3']);
  expect(definition.transitions).toHaveLength(4);
  expect(createFiniteAutomaton(definition).recognize('1')).toBe(true);
  expect(createFiniteAutomaton(definition).recognize('01')).toBe(true);
});

it('parses the official AFND example including multiple destinations and lambda transitions', () => {
  const definition = parseAutomaton(officialAfnd);

  expect(definition.type).toBe('AFND');
  expect(definition.transitions[1]).toEqual({ from: 'q0', symbol: '1', to: ['q2', 'q3'] });
  expect(definition.lambdaTransitions).toEqual([
    { from: 'q0', to: ['q1'] },
    { from: 'q3', to: ['q0', 'q2'] },
  ]);
  expect(createFiniteAutomaton(definition).recognize('')).toBe(false);
  expect(createFiniteAutomaton(definition).recognize('1')).toBe(true);
});

it('accepts BOM, CRLF, blank lines, empty finals and an AFND without lambda block', () => {
  const definition = parseAutomaton(
    `\uFEFFTIPO: AFND\r\n\r\nESTADOS: s\r\nINICIAL: s\r\nFINALES:\r\nTRANSICIONES:\r\nFIN\r\n`,
  );

  expect(definition.finalStates).toEqual([]);
  expect(definition.transitions).toEqual([]);
  expect(definition.lambdaTransitions).toEqual([]);
});

it('parses symbols that contain whitespace or escapes', () => {
  const definition = parseAutomaton(`TIPO: AFD
ESTADOS: q0 q1
INICIAL: q0
FINALES: q1
TRANSICIONES:
q0 ' ' q1
q1 '\\n' q0
FIN`);

  expect(definition.transitions.map(({ symbol }) => symbol)).toEqual([' ', '\n']);
});

it('rejects unknown types and malformed header order', () => {
  expect(() => parseAutomaton(officialAfd.replace('AFD', 'APD'))).toThrow('debe ser AFD o AFND');
  expect(() =>
    parseAutomaton(officialAfd.replace('ESTADOS:', 'INICIAL:')),
  ).toThrow('Se esperaba ESTADOS:');
});

it('rejects missing or repeated terminal sections', () => {
  expect(() => parseAutomaton(officialAfd.replace(/\nFIN$/, ''))).toThrow('Falta la línea FIN');
  expect(() => parseAutomaton(`${officialAfd}\nq0`)).toThrow('contenido después de FIN');
  expect(() =>
    parseAutomaton(officialAfnd.replace(/FIN$/, 'TRANSICIONES LAMBDA:\nFIN')),
  ).toThrow('está repetido');
});

it('rejects malformed symbol transitions with their source line', () => {
  const invalid = officialAfd.replace("q0 '0' q1", 'q0 0 q1');

  expect(() => parseAutomaton(invalid)).toThrow(AutomatonParseError);
  expect(() => parseAutomaton(invalid)).toThrow('Línea 6');
});

it('rejects nondeterminism and lambda transitions in an AFD', () => {
  const duplicate = officialAfd.replace("q0 '1' q2", "q0 '0' q2");
  expect(() => parseAutomaton(duplicate)).toThrow('más de una transición');

  const lambdaBlock = officialAfd.replace(/FIN$/, 'TRANSICIONES LAMBDA:\nq0 q1\nFIN');
  expect(() => parseAutomaton(lambdaBlock)).toThrow('no puede declarar transiciones lambda');
});

it('rejects references to undeclared states', () => {
  const invalid = officialAfd.replace("q0 '0' q1", "q0 '0' unknown");
  expect(() => parseAutomaton(invalid)).toThrow('destino no declarado unknown');
});
