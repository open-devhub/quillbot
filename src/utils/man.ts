export interface ManPage {
  title: string;
  url: string;
  raw: string;
  description: string;
}

export async function man(term: string): Promise<ManPage | null> {
  term = term.trim();

  if (!/^[a-zA-Z0-9._+-]+$/.test(term)) {
    throw new Error("Invalid man page.");
  }

  const url = `https://man.archlinux.org/man/${encodeURIComponent(term)}.txt`;

  const res = await fetch(url);

  if (!res.ok) return null;

  const raw = (await res.text()).replace(/\r\n/g, "\n").trim();

  if (!raw) return null;

  const firstLine = raw.split("\n")[0]?.trim();

  const match = firstLine?.match(/^([^(]+)\(([^)]+)\)$/);

  const sections: Record<string, string> = {};

  const headings = [
    "NAME",
    "SYNOPSIS",
    "DESCRIPTION",
    "OPTIONS",
    "COMMANDS",
    "ARGUMENTS",
    "OPERANDS",
    "EXIT STATUS",
    "RETURN VALUE",
    "ERRORS",
    "ENVIRONMENT",
    "FILES",
    "ATTRIBUTES",
    "VERSIONS",
    "STANDARDS",
    "NOTES",
    "BUGS",
    "EXAMPLES",
    "AUTHORS",
    "AUTHOR",
    "COPYRIGHT",
    "SEE ALSO",
    "HISTORY",
    "DIAGNOSTICS",
    "CAVEATS",
    "SECURITY",
  ];

  const lines = raw.split("\n");

  let current: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (headings.includes(trimmed)) {
      current = trimmed;
      sections[current] = "";
      continue;
    }

    if (current) {
      sections[current] += line + "\n";
    }
  }

  for (const key of Object.keys(sections)) {
    sections[key] = sections[key]?.trimEnd() || "";
  }

  const title = match?.[1]?.trim()?.toLowerCase() ?? term;
  const section = match?.[2] ?? "?";
  const description =
    sections["DESCRIPTION"]?.split("\n\n")[0]?.replace(/\s+/g, " ").trim() ||
    "";

  return {
    title,
    description,
    url,
    raw,
  };
}
