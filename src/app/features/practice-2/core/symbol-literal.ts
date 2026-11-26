const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  '0': '\0',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
  v: '\v',
  "'": "'",
  '"': '"',
  '\\': '\\',
};

/** Error raised when a quoted source literal does not describe exactly one symbol. */
export class SymbolLiteralError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SymbolLiteralError';
  }
}

/** Decodes a Java-style quoted character literal such as `'a'`, `' '` or `'\\n'`. */
export function parseSymbolLiteral(literal: string): string {
  if (literal.length < 2 || !literal.startsWith("'") || !literal.endsWith("'")) {
    throw new SymbolLiteralError(`El símbolo ${JSON.stringify(literal)} debe ir entre comillas simples.`);
  }

  const body = literal.slice(1, -1);
  let decoded: string;

  if (body.startsWith('\\u')) {
    if (!/^\\u[0-9a-fA-F]{4}$/.test(body)) {
      throw new SymbolLiteralError(`El escape Unicode ${literal} debe tener exactamente cuatro cifras hexadecimales.`);
    }
    decoded = String.fromCharCode(Number.parseInt(body.slice(2), 16));
  } else if (body.startsWith('\\')) {
    if (body.length !== 2 || SIMPLE_ESCAPES[body[1]] === undefined) {
      throw new SymbolLiteralError(`El escape ${literal} no está reconocido.`);
    }
    decoded = SIMPLE_ESCAPES[body[1]];
  } else {
    decoded = body;
  }

  if ([...decoded].length !== 1) {
    throw new SymbolLiteralError(`${literal} debe representar exactamente un símbolo.`);
  }

  return decoded;
}

/** Encodes one decoded symbol using the textual format accepted by the parser. */
export function formatSymbolLiteral(symbol: string): string {
  if ([...symbol].length !== 1) {
    throw new SymbolLiteralError('Solo se puede serializar un símbolo cada vez.');
  }

  const escaped = Object.entries(SIMPLE_ESCAPES).find(([, value]) => value === symbol)?.[0];
  if (escaped !== undefined && (symbol < ' ' || symbol === "'" || symbol === '\\')) {
    return `'\\${escaped}'`;
  }

  return `'${symbol}'`;
}
