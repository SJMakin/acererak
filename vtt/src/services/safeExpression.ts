/**
 * Numeric-only expression evaluator for character-sheet formulas.
 *
 * Supported syntax:
 *   - finite decimal/scientific number literals
 *   - named numeric variables
 *   - +, -, *, /, %, ^, unary +/-, and parentheses
 *
 * Function calls, assignment, strings, arrays, and property access are not part
 * of the grammar. The explicit limits keep hostile or accidental expressions
 * from consuming unbounded parser work or producing unusable numeric values.
 */

export const SAFE_EXPRESSION_LIMITS = Object.freeze({
  maxLength: 256,
  maxTokens: 128,
  maxDepth: 32,
  maxAbsoluteValue: 1_000_000_000_000,
  maxAbsoluteExponent: 100,
});

const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DISALLOWED_IDENTIFIERS = new Set(['__proto__', 'prototype', 'constructor']);

type Operator = '+' | '-' | '*' | '/' | '%' | '^';

type Token =
  | { kind: 'number'; value: number; position: number }
  | { kind: 'identifier'; value: string; position: number }
  | { kind: 'operator'; value: Operator; position: number }
  | { kind: 'leftParen'; position: number }
  | { kind: 'rightParen'; position: number }
  | { kind: 'end'; position: number };

export class SafeExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeExpressionError';
  }
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function isIdentifierStart(char: string): boolean {
  return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z') || char === '_';
}

function isIdentifierPart(char: string): boolean {
  return isIdentifierStart(char) || isDigit(char);
}

function assertBoundedFinite(value: number, description: string): number {
  if (!Number.isFinite(value)) {
    throw new SafeExpressionError(`${description} must be finite`);
  }
  if (Math.abs(value) > SAFE_EXPRESSION_LIMITS.maxAbsoluteValue) {
    throw new SafeExpressionError(`${description} exceeds the allowed numeric range`);
  }
  return value;
}

class Lexer {
  private position = 0;
  private tokenCount = 0;

  constructor(private readonly input: string) {}

  next(): Token {
    this.skipWhitespace();
    const position = this.position;

    if (position >= this.input.length) {
      return { kind: 'end', position };
    }

    this.tokenCount += 1;
    if (this.tokenCount > SAFE_EXPRESSION_LIMITS.maxTokens) {
      throw new SafeExpressionError(`Expression exceeds ${SAFE_EXPRESSION_LIMITS.maxTokens} tokens`);
    }

    const char = this.input[position];

    if (isDigit(char) || (char === '.' && isDigit(this.peek(1)))) {
      return this.readNumber();
    }

    if (isIdentifierStart(char)) {
      return this.readIdentifier();
    }

    this.position += 1;
    if (char === '(') return { kind: 'leftParen', position };
    if (char === ')') return { kind: 'rightParen', position };
    if (char === '+' || char === '-' || char === '*' || char === '/' || char === '%' || char === '^') {
      return { kind: 'operator', value: char, position };
    }

    throw new SafeExpressionError(`Unexpected character '${char}' at position ${position}`);
  }

  private readNumber(): Token {
    const start = this.position;

    while (isDigit(this.peek())) this.position += 1;
    if (this.peek() === '.') {
      this.position += 1;
      while (isDigit(this.peek())) this.position += 1;
    }

    if (this.peek() === 'e' || this.peek() === 'E') {
      this.position += 1;
      if (this.peek() === '+' || this.peek() === '-') this.position += 1;
      const exponentStart = this.position;
      while (isDigit(this.peek())) this.position += 1;
      if (this.position === exponentStart) {
        throw new SafeExpressionError(`Invalid exponent at position ${exponentStart}`);
      }
    }

    const raw = this.input.slice(start, this.position);
    const value = assertBoundedFinite(Number(raw), `Number at position ${start}`);
    return { kind: 'number', value, position: start };
  }

  private readIdentifier(): Token {
    const start = this.position;
    this.position += 1;
    while (isIdentifierPart(this.peek())) this.position += 1;
    return {
      kind: 'identifier',
      value: this.input.slice(start, this.position),
      position: start,
    };
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.peek())) this.position += 1;
  }

  private peek(offset = 0): string {
    return this.input[this.position + offset] ?? '';
  }
}

class NumericExpressionParser {
  private current: Token;
  private depth = 0;

  constructor(
    private readonly lexer: Lexer,
    private readonly variables: ReadonlyMap<string, number>
  ) {
    this.current = lexer.next();
  }

  parse(): number {
    if (this.current.kind === 'end') {
      throw new SafeExpressionError('Expression cannot be empty');
    }

    const value = this.parseAdditive();
    const trailing = this.currentToken();
    if (trailing.kind !== 'end') {
      throw new SafeExpressionError(`Unexpected token at position ${trailing.position}`);
    }
    return assertBoundedFinite(value, 'Expression result');
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative();
    let operator = this.takeOperator('+', '-');
    while (operator !== null) {
      const right = this.parseMultiplicative();
      value = this.checkedOperation(operator === '+' ? value + right : value - right);
      operator = this.takeOperator('+', '-');
    }
    return value;
  }

  private parseMultiplicative(): number {
    let value = this.parseUnary();
    let operator = this.takeOperator('*', '/', '%');
    while (operator !== null) {
      const right = this.parseUnary();

      if ((operator === '/' || operator === '%') && right === 0) {
        throw new SafeExpressionError(operator === '/' ? 'Division by zero is not allowed' : 'Modulo by zero is not allowed');
      }

      if (operator === '*') value = this.checkedOperation(value * right);
      if (operator === '/') value = this.checkedOperation(value / right);
      if (operator === '%') value = this.checkedOperation(value % right);
      operator = this.takeOperator('*', '/', '%');
    }
    return value;
  }

  private parseUnary(): number {
    const operator = this.takeOperator('+', '-');
    if (operator !== null) {
      const value = this.withDepth(() => this.parseUnary());
      return operator === '-' ? this.checkedOperation(-value) : value;
    }
    return this.parsePower();
  }

  private parsePower(): number {
    const base = this.parsePrimary();
    if (this.takeOperator('^') === null) return base;

    const exponent = this.withDepth(() => this.parseUnary());
    if (Math.abs(exponent) > SAFE_EXPRESSION_LIMITS.maxAbsoluteExponent) {
      throw new SafeExpressionError('Exponent exceeds the allowed range');
    }
    return this.checkedOperation(base ** exponent);
  }

  private parsePrimary(): number {
    const token = this.currentToken();

    if (token.kind === 'number') {
      const value = token.value;
      this.advance();
      return value;
    }

    if (token.kind === 'identifier') {
      const { value: name, position } = token;
      this.advance();

      if (DISALLOWED_IDENTIFIERS.has(name)) {
        throw new SafeExpressionError(`Identifier '${name}' is not allowed`);
      }
      const value = this.variables.get(name);
      if (value === undefined) {
        throw new SafeExpressionError(`Unknown variable '${name}' at position ${position}`);
      }
      return value;
    }

    if (token.kind === 'leftParen') {
      this.advance();
      const value = this.withDepth(() => this.parseAdditive());
      const closing = this.currentToken();
      if (closing.kind !== 'rightParen') {
        throw new SafeExpressionError(`Missing closing parenthesis at position ${closing.position}`);
      }
      this.advance();
      return value;
    }

    throw new SafeExpressionError(`Expected a number, variable, or '(' at position ${token.position}`);
  }

  private takeOperator(...operators: Operator[]): Operator | null {
    const token = this.currentToken();
    if (token.kind !== 'operator' || !operators.includes(token.value)) return null;
    this.advance();
    return token.value;
  }

  private currentToken(): Token {
    return this.current;
  }

  private advance(): void {
    this.current = this.lexer.next();
  }

  private checkedOperation(value: number): number {
    return assertBoundedFinite(value, 'Intermediate result');
  }

  private withDepth<T>(operation: () => T): T {
    this.depth += 1;
    if (this.depth > SAFE_EXPRESSION_LIMITS.maxDepth) {
      this.depth -= 1;
      throw new SafeExpressionError(`Expression exceeds nesting depth ${SAFE_EXPRESSION_LIMITS.maxDepth}`);
    }
    try {
      return operation();
    } finally {
      this.depth -= 1;
    }
  }
}

function collectSafeVariables(variables: Readonly<Record<string, number>>): ReadonlyMap<string, number> {
  const safeVariables = new Map<string, number>();
  for (const name of Object.keys(variables)) {
    if (!IDENTIFIER_PATTERN.test(name) || DISALLOWED_IDENTIFIERS.has(name)) continue;
    const value = variables[name];
    if (typeof value !== 'number') continue;
    safeVariables.set(name, assertBoundedFinite(value, `Variable '${name}'`));
  }
  return safeVariables;
}

export function evaluateNumericExpression(
  expression: string,
  variables: Readonly<Record<string, number>> = {}
): number {
  if (typeof expression !== 'string') {
    throw new SafeExpressionError('Expression must be a string');
  }
  if (expression.length > SAFE_EXPRESSION_LIMITS.maxLength) {
    throw new SafeExpressionError(`Expression exceeds ${SAFE_EXPRESSION_LIMITS.maxLength} characters`);
  }

  const parser = new NumericExpressionParser(
    new Lexer(expression),
    collectSafeVariables(variables)
  );
  return parser.parse();
}
