import { formatSymbolLiteral, parseSymbolLiteral } from './symbol-literal';

it('parses printable and whitespace character literals', () => {
  expect(parseSymbolLiteral("'a'")).toBe('a');
  expect(parseSymbolLiteral("' '")).toBe(' ');
  expect(parseSymbolLiteral("'\\n'")).toBe('\n');
  expect(parseSymbolLiteral("'\\t'")).toBe('\t');
});

it('parses escaped quote, backslash and unicode literals', () => {
  expect(parseSymbolLiteral("'\\''")).toBe("'");
  expect(parseSymbolLiteral("'\\\\'")).toBe('\\');
  expect(parseSymbolLiteral("'\\u0041'")).toBe('A');
});

it('rejects malformed or multi-symbol literals', () => {
  expect(() => parseSymbolLiteral('a')).toThrow('comillas simples');
  expect(() => parseSymbolLiteral("''")).toThrow('exactamente un símbolo');
  expect(() => parseSymbolLiteral("'ab'")).toThrow('exactamente un símbolo');
  expect(() => parseSymbolLiteral("'\\x'")).toThrow('no está reconocido');
  expect(() => parseSymbolLiteral("'\\u12'")).toThrow('cuatro cifras');
});

it('formats decoded symbols back into accepted literals', () => {
  expect(formatSymbolLiteral('a')).toBe("'a'");
  expect(formatSymbolLiteral(' ')).toBe("' '");
  expect(formatSymbolLiteral('\n')).toBe("'\\n'");
  expect(formatSymbolLiteral("'")).toBe("'\\''");
  expect(formatSymbolLiteral('\\')).toBe("'\\\\'");
});
