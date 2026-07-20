//  ranking
const RANK = {
  "O(1)": 0,
  "O(log n)": 1,
  "O(n)": 2,
  "O(n log n)": 3,
  "O(n²)": 4,
  "O(n³)": 5,
  "O(n^k)": 6,
  "O(2ⁿ)": 7,
  "O(n!)": 8,
} as const;

type Complexity = keyof typeof RANK;

function worse(a: Complexity, b: Complexity): Complexity {
  return RANK[a] >= RANK[b] ? a : b;
}

//  prep
function stripDecorators(input: string): string {
  return input
    .replace(/\/\/.*$/gm, (m) => " ".repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, (m) => " ".repeat(m.length));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// find index of the closing brace matching the "{" at openIndex
function matchBrace(str: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < str.length; i++) {
    const ch = str.charAt(i);
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// find index of the closing paren matching the "(" at openIndex
function matchParen(str: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < str.length; i++) {
    const ch = str.charAt(i);
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

//  loop-depth profile
const LOOP_HEADER_RE = new RegExp(
  [
    String.raw`\bfor\s*\([^{}]*\)\s*$`,
    String.raw`\bwhile\s*\([^{}]*\)\s*$`,
    String.raw`\bdo\s*$`,
    String.raw`\.(?:forEach|map|filter|reduce|reduceRight|some|every|find|findIndex|flatMap)\s*\(\s*(?:async\s*)?(?:function\b[^{}]*|\([^{}]*\)\s*=>|[a-zA-Z_$][\w$]*\s*=>)\s*$`,
  ].join("|"),
);

interface LoopProfile {
  depthAt: number[];
  maxDepth: number;
}

function loopDepthProfile(str: string): LoopProfile {
  const depthAt: number[] = new Array(str.length + 1).fill(0);
  const stack: boolean[] = [];
  let current = 0;
  let max = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charAt(i);
    if (ch === "{") {
      const before = str.slice(Math.max(0, i - 220), i);
      const isLoop = LOOP_HEADER_RE.test(before);
      stack.push(isLoop);
      if (isLoop) {
        current++;
        if (current > max) max = current;
      }
    } else if (ch === "}") {
      const wasLoop = stack.pop();
      if (wasLoop) current--;
    }
    depthAt[i + 1] = current;
  }
  return { depthAt, maxDepth: max };
}

// brace-less fallback: catches `for (...) doThing();` with no block
const BARE_LOOP_RE = /\b(?:for|while)\s*\([^)]*\)\s*(?!\s*\{)/;

interface FunctionInfo {
  name: string;
  bodyStart: number;
  bodyEnd: number;
  headerIndex: number;
}

// A discovered function: { name, bodyStart, bodyEnd, headerIndex }
function findFunctions(code: string): FunctionInfo[] {
  const found: FunctionInfo[] = [];

  const FUNC_LIKE_RE =
    /\b(?:function\s*\*?\s*)?([a-zA-Z_$][\w$]*)\s*\(([^()]*)\)\s*(?::\s*[^{=;]+)?\{/g;
  const CONTROL_KEYWORDS = new Set([
    "if",
    "for",
    "while",
    "switch",
    "catch",
    "function",
    "return",
    "else",
    "do",
    "try",
    "finally",
    "typeof",
    "new",
    "in",
    "of",
    "await",
    "yield",
    "delete",
    "void",
    "instanceof",
    "constructor",
  ]);

  let m: RegExpExecArray | null;
  while ((m = FUNC_LIKE_RE.exec(code))) {
    const name = m[1];
    if (name === undefined) continue;
    if (CONTROL_KEYWORDS.has(name)) continue;
    const fullMatch = m[0];
    if (fullMatch === undefined) continue;
    const braceIdx = m.index + fullMatch.length - 1; // the "{" itself
    const bodyEnd = matchBrace(code, braceIdx);
    if (bodyEnd === -1) continue;
    found.push({
      name,
      headerIndex: braceIdx,
      bodyStart: braceIdx + 1,
      bodyEnd,
    });
  }

  const ARROW_RE =
    /\b(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^()]*\)|[a-zA-Z_$][\w$]*)\s*(?::\s*[^=]+)?=>\s*/g;

  while ((m = ARROW_RE.exec(code))) {
    const name = m[1];
    if (name === undefined) continue;
    const fullMatch = m[0];
    if (fullMatch === undefined) continue;
    const afterArrow = m.index + fullMatch.length;
    // skip whitespace
    let i = afterArrow;
    while (i < code.length && /\s/.test(code.charAt(i))) i++;
    if (code.charAt(i) === "{") {
      const bodyEnd = matchBrace(code, i);
      if (bodyEnd === -1) continue;
      found.push({ name, headerIndex: i, bodyStart: i + 1, bodyEnd });
    } else {
      // expression body: scan until a top-level `;` or `,` (depth 0 relative to start)
      let depth = 0;
      let j = i;
      for (; j < code.length; j++) {
        const c = code.charAt(j);
        if (c === "(" || c === "[" || c === "{") depth++;
        else if (c === ")" || c === "]" || c === "}") {
          if (depth === 0) break;
          depth--;
        } else if ((c === ";" || c === ",") && depth === 0) {
          break;
        }
      }
      found.push({ name, headerIndex: i, bodyStart: i, bodyEnd: j });
    }
  }

  return found;
}

//  recursion classification per function
const HALVING_RE =
  /\/\s*2\b|>>>?\s*1\b|Math\.floor\([^()]*\/\s*2\)|Math\.ceil\([^()]*\/\s*2\)/;
const DECREMENT_RE = /[a-zA-Z_$][\w$]*\s*-\s*\d+\b|--/;
const MEMO_RE =
  /\b(?:memo|cache|dp|seen|visited)\b\s*(?:\[|\.\s*(?:get|has)\s*\()/i;

interface RecursionResult {
  complexity: Complexity;
  note: string;
  callCount: number;
  memoized: boolean;
  halvingAll: boolean;
  callInsideLoop: boolean;
}

function analyzeRecursion(
  code: string,
  fn: FunctionInfo,
  loopProfile: LoopProfile,
): RecursionResult | null {
  const body = code.slice(fn.bodyStart, fn.bodyEnd);
  const nameRe = new RegExp(`\\b${escapeRegExp(fn.name)}\\s*\\(`, "g");

  const callSites: { absIndex: number; args: string }[] = [];
  let cm: RegExpExecArray | null;
  while ((cm = nameRe.exec(body))) {
    const fullMatch = cm[0];
    if (fullMatch === undefined) continue;
    const absIndex = fn.bodyStart + cm.index;
    const parenOpen = fn.bodyStart + cm.index + fullMatch.length - 1;
    const parenClose = matchParen(code, parenOpen);
    const args = parenClose === -1 ? "" : code.slice(parenOpen + 1, parenClose);
    callSites.push({ absIndex, args });
  }

  if (callSites.length === 0) return null;

  const halvingAll = callSites.every((c) => HALVING_RE.test(c.args));
  const anyDecrement = callSites.some((c) => DECREMENT_RE.test(c.args));

  const baseDepth = loopProfile.depthAt[fn.headerIndex] ?? 0;
  const callInsideLoop = callSites.some((c) => {
    const relDepth = (loopProfile.depthAt[c.absIndex] ?? 0) - baseDepth;
    return relDepth > 0;
  });

  const searchWindowStart = Math.max(0, fn.headerIndex - 300);
  const memoized = MEMO_RE.test(code.slice(searchWindowStart, fn.bodyEnd));

  let complexity: Complexity;
  let note: string;

  if (callSites.length === 1 && callInsideLoop) {
    complexity = "O(n!)";
    note = `Recursive call to "${fn.name}" occurs inside a loop within the same function (backtracking/permutation pattern)`;
  } else if (callSites.length >= 2 && callInsideLoop) {
    complexity = "O(n!)";
    note = `Multiple recursive calls to "${fn.name}", at least one nested inside a loop (backtracking pattern)`;
  } else if (callSites.length === 1) {
    const firstCall = callSites[0];
    if (firstCall !== undefined && HALVING_RE.test(firstCall.args)) {
      complexity = "O(log n)";
      note = `Single recursive call to "${fn.name}" shrinks input by half each time`;
    } else {
      complexity = "O(n)";
      note = `Single recursive call to "${fn.name}" (linear recursion)`;
    }
  } else {
    // 2+ self-calls
    if (halvingAll) {
      complexity = "O(n log n)";
      note = `Multiple recursive calls to "${fn.name}" each operate on a halved input (divide-and-conquer)`;
    } else if (memoized) {
      complexity = "O(n)";
      note = `Multiple recursive calls to "${fn.name}" detected, but memoization (cache/memo/dp) caps repeated work`;
    } else {
      complexity = "O(2ⁿ)";
      note = `Multiple recursive calls to "${fn.name}" without memoization (exponential branching)`;
    }
  }

  return {
    complexity,
    note,
    callCount: callSites.length,
    memoized,
    halvingAll,
    callInsideLoop,
  };
}

//  main
interface AnalysisResult {
  complexity: Complexity;
  confidence: "Low" | "Medium" | "High";
  indicators: string[];
  reasoning: string[];
  _debug: {
    loopComplexity: Complexity;
    recComplexity: Complexity;
    maxDepth: number;
  };
}

export function analyzeComplexity(rawCode: string): AnalysisResult {
  const code = stripDecorators(rawCode);
  const indicators: string[] = [];
  const reasoning: string[] = [];

  // loops
  const profile = loopDepthProfile(code);
  let loopComplexity: Complexity = "O(1)";
  if (profile.maxDepth >= 3) {
    loopComplexity = profile.maxDepth === 3 ? "O(n³)" : "O(n^k)";
    indicators.push(`${profile.maxDepth}-deep nested loop detected`);
  } else if (profile.maxDepth === 2) {
    loopComplexity = "O(n²)";
    indicators.push("Nested loop (depth 2) detected");
  } else if (profile.maxDepth === 1) {
    loopComplexity = "O(n)";
    indicators.push("Single loop detected");
  } else if (BARE_LOOP_RE.test(code)) {
    loopComplexity = "O(n)";
    indicators.push("Brace-less loop detected");
  }

  const sortDetected = /\.sort\s*\(/.test(code);
  if (sortDetected) {
    indicators.push("Sorting operation detected (.sort)");
    loopComplexity = worse(loopComplexity, "O(n log n)");
  }

  const collectionHelperDetected =
    /\b(?:map|filter|reduce|reduceRight|some|every|find|findIndex|includes|forEach|flatMap)\s*\(/.test(
      code,
    );
  if (collectionHelperDetected && loopComplexity === "O(1)") {
    loopComplexity = "O(n)";
    indicators.push("Collection iteration helper detected");
  }

  const logPatternDetected =
    /(?:\/=|>>=|<<=|\*=\s*0\.5|Math\.log|Math\.sqrt|\blog2\b|\blog10\b)/.test(
      code,
    ) && loopComplexity === "O(1)";
  if (logPatternDetected) {
    loopComplexity = "O(log n)";
    indicators.push(
      "Logarithmic pattern detected (no loop/recursion driving it)",
    );
  }

  // recursion
  const functions = findFunctions(code);
  let recComplexity: Complexity = "O(1)";
  let bestRecNote: string | null = null;
  let recursionSeen = false;
  let memoSeen = false;

  for (const fn of functions) {
    const result = analyzeRecursion(code, fn, profile);
    if (!result) continue;
    recursionSeen = true;
    if (result.memoized) memoSeen = true;
    if (RANK[result.complexity] > RANK[recComplexity]) {
      recComplexity = result.complexity;
      bestRecNote = result.note;
    }
  }

  if (recursionSeen) {
    indicators.push("Recursive call pattern detected");
    if (memoSeen)
      indicators.push("Memoization pattern detected (cache/memo/dp)");
  }
  if (bestRecNote) reasoning.push(bestRecNote);

  const complexity = worse(loopComplexity, recComplexity);

  if (indicators.length === 0) {
    indicators.push("No strong complexity indicators detected");
  }

  if (reasoning.length === 0) {
    if (profile.maxDepth >= 2) {
      reasoning.push(
        `Nested loops (depth ${profile.maxDepth}) are the primary complexity driver.`,
      );
    } else if (sortDetected) {
      reasoning.push("Sorting operations are typically O(n log n).");
    } else if (logPatternDetected) {
      reasoning.push("Logarithmic operations suggest O(log n) behavior.");
    } else if (loopComplexity === "O(n)") {
      reasoning.push("Linear iteration is the main complexity indicator.");
    } else {
      reasoning.push("No clear complexity-driving patterns found.");
    }
  }

  // confidence
  let confidence: "Low" | "Medium" | "High" = "Low";
  if (
    recComplexity === "O(2ⁿ)" ||
    recComplexity === "O(n!)" ||
    profile.maxDepth >= 2
  ) {
    confidence = "High";
  } else if (recursionSeen || loopComplexity !== "O(1)") {
    confidence = "Medium";
  }

  return {
    complexity,
    confidence,
    indicators,
    reasoning,
    _debug: { loopComplexity, recComplexity, maxDepth: profile.maxDepth },
  };
}
