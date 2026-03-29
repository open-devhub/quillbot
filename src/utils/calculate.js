function calculate(input) {
  const funcs = {};
  const consts = {};
  for (const key of Object.getOwnPropertyNames(Math)) {
    const val = Math[key];
    if (typeof val === "function") funcs[key.toLowerCase()] = val;
    else consts[key.toLowerCase()] = val;
  }

  input = input.replace(/\^/g, "**");

  const tokenRe =
    /\s*([0-9]*\.?[0-9]+(?:e[+-]?\d+)?|[a-zA-Z_][a-zA-Z0-9_]*|\*\*|[+\-*/(),])\s*/g;
  const rawTokens = [];
  let m;
  while ((m = tokenRe.exec(input)) !== null) rawTokens.push(m[1]);

  if (rawTokens.length === 0) throw new Error("Empty or invalid expression");

  const tokens = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i];
    if (t === "-") {
      const prev = tokens.length ? tokens[tokens.length - 1] : null;
      if (
        prev === null ||
        prev === "(" ||
        prev === "," ||
        (typeof prev === "string" && /^[+\-*/(**]$/.test(prev))
      ) {
        tokens.push("u-");
        continue;
      }
    }
    tokens.push(t);
  }

  const outputQueue = [];
  const opStack = [];
  const argCountStack = [];

  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2, "**": 3, "u-": 4 };
  const rightAssoc = { "**": true, "u-": true };

  const isOp = (t) => t in precedence;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const lower = typeof token === "string" ? token.toLowerCase() : token;

    if (!isNaN(Number(token))) {
      outputQueue.push(Number(token));
    } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
      const next = tokens[i + 1];
      if (next === "(") {
        opStack.push(lower);
        argCountStack.push(0);
      } else if (lower in consts) {
        outputQueue.push(consts[lower]);
      } else {
        throw new Error("Unknown identifier: " + token);
      }
    } else if (token === ",") {
      while (opStack.length && opStack[opStack.length - 1] !== "(") {
        outputQueue.push(opStack.pop());
      }
      if (!opStack.length)
        throw new Error("Misplaced comma or mismatched parentheses");
      if (argCountStack.length) {
        argCountStack[argCountStack.length - 1] += 1;
      } else {
        throw new Error("Comma outside function call");
      }
    } else if (token === "(") {
      opStack.push(token);
    } else if (token === ")") {
      while (opStack.length && opStack[opStack.length - 1] !== "(") {
        outputQueue.push(opStack.pop());
      }
      if (!opStack.length) throw new Error("Mismatched parentheses");
      opStack.pop();

      if (
        opStack.length &&
        typeof opStack[opStack.length - 1] === "string" &&
        opStack[opStack.length - 1] in funcs
      ) {
        const fname = opStack.pop();
        const argCount = argCountStack.pop();
        const argc = argCount === 0 && tokens[i - 1] === "(" ? 0 : argCount + 1;
        outputQueue.push({ type: "func", name: fname, argc });
      }
    } else if (isOp(token)) {
      while (
        opStack.length &&
        isOp(opStack[opStack.length - 1]) &&
        ((!rightAssoc[token] &&
          precedence[token] <= precedence[opStack[opStack.length - 1]]) ||
          (rightAssoc[token] &&
            precedence[token] < precedence[opStack[opStack.length - 1]]))
      ) {
        outputQueue.push(opStack.pop());
      }
      opStack.push(token);
    } else {
      throw new Error("Unknown token: " + token);
    }
  }

  while (opStack.length) {
    const op = opStack.pop();
    if (op === "(" || op === ")") throw new Error("Mismatched parentheses");
    if (typeof op === "string" && op in funcs)
      throw new Error("Function call missing parentheses for " + op);
    outputQueue.push(op);
  }

  const evalStack = [];
  for (const tk of outputQueue) {
    if (typeof tk === "number") {
      evalStack.push(tk);
    } else if (typeof tk === "string" && isOp(tk)) {
      if (tk === "u-") {
        const a = evalStack.pop();
        evalStack.push(-a);
      } else {
        const b = evalStack.pop();
        const a = evalStack.pop();
        if (tk === "+") evalStack.push(a + b);
        else if (tk === "-") evalStack.push(a - b);
        else if (tk === "*") evalStack.push(a * b);
        else if (tk === "/") evalStack.push(a / b);
        else if (tk === "**") evalStack.push(a ** b);
      }
    } else if (typeof tk === "object" && tk.type === "func") {
      const f = funcs[tk.name];
      if (!f) throw new Error("Unknown function: " + tk.name);
      const argc = tk.argc;
      const args = [];
      for (let i = 0; i < argc; i++) {
        args.unshift(evalStack.pop());
      }
      evalStack.push(f(...args));
    } else {
      throw new Error("Invalid RPN token: " + JSON.stringify(tk));
    }
  }

  if (evalStack.length !== 1)
    throw new Error("Invalid expression (stack leftover)");
  return evalStack[0];
}

export default { calculate };
