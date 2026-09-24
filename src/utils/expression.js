/** Bounded arithmetic parser; never executes JavaScript or accesses properties. */
const functions = new Map(Object.entries({ sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, sqrt: Math.sqrt, abs: Math.abs, log: Math.log10, ln: Math.log, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round }));
const constants = new Map([['PI', Math.PI], ['E', Math.E]]);
export function evaluateExpression(input) {
  if (typeof input !== 'string' || input.length > 4096) throw new Error('Expression is too long');
  const source = input.trim().replace(/×/g, '*').replace(/÷/g, '/');
  const pattern = /\s*((?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z][A-Za-z0-9_]*|\*\*|[+\-*/%^(),])/y;
  const tokens = [];
  let position = 0;
  while (position < source.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(source);
    if (!match) throw new Error('Invalid expression token');
    tokens.push(match[1]); position = pattern.lastIndex;
  }
  let cursor = 0;
  const finite = value => { if (!Number.isFinite(value)) throw new Error('Result is not finite'); return value; };
  function expression(min = 0, depth = 0) {
    if (depth > 64) throw new Error('Expression is too deeply nested');
    const token = tokens[cursor++];
    let left;
    if (token === '+' || token === '-') left = (token === '-' ? -1 : 1) * expression(30, depth + 1);
    else if (token === '(') { left = expression(0, depth + 1); if (tokens[cursor++] !== ')') throw new Error('Missing closing parenthesis'); }
    else if (functions.has(token)) {
      if (tokens[cursor++] !== '(') throw new Error('Function requires parentheses');
      const value = expression(0, depth + 1);
      if (tokens[cursor++] !== ')') throw new Error('Function requires one argument');
      left = finite(functions.get(token)(value));
    } else if (constants.has(token)) left = constants.get(token);
    else if (token !== undefined && /^(?:\d|\.)/.test(token)) left = finite(Number(token));
    else throw new Error('Expected a number, constant or allowed function');
    while (cursor < tokens.length) {
      const op = tokens[cursor];
      const precedence = { '+': 10, '-': 10, '*': 20, '/': 20, '%': 20, '^': 40, '**': 40 }[op];
      if (precedence === undefined || precedence < min) break;
      cursor++;
      const right = expression(precedence + (precedence === 40 ? 0 : 1), depth + 1);
      switch (op) {
        case '+': left += right; break; case '-': left -= right; break;
        case '*': left *= right; break; case '/': left /= right; break;
        case '%': left %= right; break; default: left **= right;
      }
      finite(left);
    }
    return finite(left);
  }
  const result = expression();
  if (cursor !== tokens.length) throw new Error('Unexpected token');
  return result;
}
