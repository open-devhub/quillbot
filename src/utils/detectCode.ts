import type { DetectedLanguage } from "flourite";
import flourite from "flourite";

export interface Section {
  type: "text" | "code";
  text: string;
  language?: string;
}

export interface AnalysisResult {
  isCode: boolean;
  score: number;
  sections: Section[];
}

function isCodeLine(line: string, previousWasCode: boolean): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();

  const strong = [
    "def ",
    "function ",
    "class ",
    "const ",
    "let ",
    "var ",
    "import ",
    "export ",
    "interface ",
    "type ",
    "enum ",
    "public ",
    "private ",
    "protected ",
    "static ",
    "fn ",
    "pub ",
    "async function",
    "async ",
  ];
  if (strong.some((s) => lower.startsWith(s))) return true;

  const leadingWs = line.length - line.trimStart().length;
  if (leadingWs >= 2 && /^[a-zA-Z_$#]/.test(trimmed)) return true;

  if (/[:{]\s*$/.test(trimmed) && previousWasCode) return true;

  if (/^\s*(if|for|while|switch|try|catch)\b/.test(trimmed)) return true;

  const codeSymbols = (trimmed.match(/[{}();:=<>[\]]/g) || []).length;
  const hasRealCodePunct = codeSymbols >= 2;

  if (hasRealCodePunct && previousWasCode) return true;

  const englishWords =
    /\b(hello|everybody|someone|help|trying|write|simple|function|typescript|correct|here is|some text|after the code)\b/i;
  if (englishWords.test(trimmed) && codeSymbols < 5) return false;

  return false;
}

export function detectCode(content: string): AnalysisResult {
  if (!content || typeof content !== "string") {
    return { isCode: false, score: 0, sections: [] };
  }

  if (content.includes("```")) {
    return {
      isCode: false,
      score: 0,
      sections: [{ type: "text", text: content }],
    };
  }

  const lines = content.split("\n");
  const hasNewlines = lines.length > 1;

  if (!hasNewlines) {
    return {
      isCode: false,
      score: 0,
      sections: [{ type: "text", text: content }],
    };
  }

  const rawSections: Section[] = [];
  let current: Section | null = null;
  let previousWasCode = false;
  let codeLineCount = 0;

  for (const line of lines) {
    const isCode = isCodeLine(line, previousWasCode);

    if (isCode) {
      codeLineCount++;
      if (!current || current.type !== "code") {
        if (current) rawSections.push(current);
        current = { type: "code", text: line };
      } else {
        current.text += "\n" + line;
      }
    } else {
      if (!current || current.type !== "text") {
        if (current) rawSections.push(current);
        current = { type: "text", text: line };
      } else {
        current.text += "\n" + line;
      }
    }
    previousWasCode = isCode;
  }
  if (current) rawSections.push(current);

  const sections: Section[] = [];

  for (const sec of rawSections) {
    let text = sec.text.replace(/^\n+/, "").replace(/\n+$/, "");
    if (!text.trim()) continue;

    if (sec.type === "code") {
      let detectedLang: string | undefined;

      try {
        const detect = flourite as unknown as (
          snippet: string,
        ) => DetectedLanguage;
        const result = detect(text.trim());

        if (result.language && result.language !== "Unknown") {
          detectedLang = result.language.toLowerCase();
        } else {
          const statistics: Record<string, number> = result.statistics ?? {};
          let best = 0;
          for (const [lang, score] of Object.entries(statistics)) {
            if (lang !== "Unknown" && score > best) {
              best = score;
              detectedLang = lang.toLowerCase();
            }
          }
        }
      } catch {}

      if (detectedLang) {
        sections.push({ type: "code", text, language: detectedLang });
      } else {
        sections.push({ type: "code", text });
      }
    } else {
      sections.push({ type: "text", text });
    }
  }

  const totalLines = lines.length;
  const codeRatio = totalLines > 0 ? (codeLineCount / totalLines) * 100 : 0;
  const score = Math.min(100, Math.round(codeRatio));

  const isCode = sections.some((s) => s.type === "code") && score >= 25;

  return {
    isCode,
    score,
    sections,
  };
}
