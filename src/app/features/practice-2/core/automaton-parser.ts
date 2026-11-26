import type {
  AutomatonDefinition,
  AutomatonType,
  LambdaTransitionDefinition,
  SymbolTransitionDefinition,
} from './models';
import { AutomatonValidationError, normalizeAutomatonDefinition } from './automaton-validation';
import { parseSymbolLiteral, SymbolLiteralError } from './symbol-literal';

interface SourceLine {
  readonly number: number;
  readonly text: string;
}

/** Syntax or semantic error annotated with its source line whenever possible. */
export class AutomatonParseError extends Error {
  constructor(message: string, readonly lineNumber?: number) {
    super(lineNumber === undefined ? message : `Línea ${lineNumber}: ${message}`);
    this.name = 'AutomatonParseError';
  }
}

function parseHeader(line: SourceLine | undefined, label: string): string {
  if (line === undefined) throw new AutomatonParseError(`Falta la cabecera ${label}.`);
  const prefix = `${label}:`;
  if (!line.text.startsWith(prefix)) {
    throw new AutomatonParseError(`Se esperaba ${prefix}.`, line.number);
  }
  return line.text.slice(prefix.length).trim();
}

function parseStateList(source: string): string[] {
  return source === '' ? [] : source.split(/\s+/);
}

function parseSymbolTransition(line: SourceLine): SymbolTransitionDefinition {
  const match = /^([A-Za-z0-9]+)\s+('(?:[^'\\]|\\.)*')\s+(.+)$/.exec(line.text);
  if (match === null) {
    throw new AutomatonParseError(
      "La transición debe tener el formato: origen 'símbolo' destino [destino...].",
      line.number,
    );
  }

  let symbol: string;
  try {
    symbol = parseSymbolLiteral(match[2]);
  } catch (error) {
    if (error instanceof SymbolLiteralError) {
      throw new AutomatonParseError(error.message, line.number);
    }
    throw error;
  }

  return {
    from: match[1],
    symbol,
    to: parseStateList(match[3].trim()),
  };
}

function parseLambdaTransition(line: SourceLine): LambdaTransitionDefinition {
  const parts = line.text.split(/\s+/);
  if (parts.length < 2) {
    throw new AutomatonParseError(
      'La transición lambda debe incluir un origen y al menos un destino.',
      line.number,
    );
  }
  return { from: parts[0], to: parts.slice(1) };
}

/** Parses the official AFD/AFND text format, accepting blank lines and CRLF input. */
export function parseAutomaton(source: string): AutomatonDefinition {
  const lines: SourceLine[] = source
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((text, index) => ({ number: index + 1, text: text.trim() }))
    .filter(({ text }) => text !== '');

  let cursor = 0;
  const rawType = parseHeader(lines[cursor++], 'TIPO');
  if (rawType !== 'AFD' && rawType !== 'AFND') {
    throw new AutomatonParseError(`El tipo debe ser AFD o AFND, no ${rawType || '(vacío)'}.`, lines[0]?.number);
  }
  const type: AutomatonType = rawType;
  const states = parseStateList(parseHeader(lines[cursor++], 'ESTADOS'));
  const initialValues = parseStateList(parseHeader(lines[cursor++], 'INICIAL'));
  if (initialValues.length !== 1) {
    throw new AutomatonParseError('INICIAL debe contener exactamente un estado.', lines[cursor - 1]?.number);
  }
  const finalStates = parseStateList(parseHeader(lines[cursor++], 'FINALES'));

  const transitionHeader = lines[cursor++];
  if (transitionHeader?.text !== 'TRANSICIONES:') {
    throw new AutomatonParseError('Se esperaba TRANSICIONES:.', transitionHeader?.number);
  }

  const transitions: SymbolTransitionDefinition[] = [];
  const lambdaTransitions: LambdaTransitionDefinition[] = [];
  let readingLambdaTransitions = false;
  let foundEnd = false;

  while (cursor < lines.length) {
    const line = lines[cursor++];
    if (line.text === 'FIN') {
      foundEnd = true;
      break;
    }
    if (line.text === 'TRANSICIONES LAMBDA:') {
      if (type === 'AFD') {
        throw new AutomatonParseError('Un AFD no puede declarar transiciones lambda.', line.number);
      }
      if (readingLambdaTransitions) {
        throw new AutomatonParseError('El bloque TRANSICIONES LAMBDA está repetido.', line.number);
      }
      readingLambdaTransitions = true;
      continue;
    }

    if (readingLambdaTransitions) lambdaTransitions.push(parseLambdaTransition(line));
    else transitions.push(parseSymbolTransition(line));
  }

  if (!foundEnd) throw new AutomatonParseError('Falta la línea FIN.');
  if (cursor < lines.length) {
    throw new AutomatonParseError('No se permite contenido después de FIN.', lines[cursor].number);
  }

  const definition: AutomatonDefinition = {
    type,
    states,
    initialState: initialValues[0],
    finalStates,
    transitions,
    lambdaTransitions,
  };

  try {
    normalizeAutomatonDefinition(definition);
  } catch (error) {
    if (error instanceof AutomatonValidationError) {
      throw new AutomatonParseError(`Definición inválida:\n${error.issues.join('\n')}`);
    }
    throw error;
  }

  return definition;
}
