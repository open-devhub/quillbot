interface VersionSection {
  title: string;
  content: string;
}

export function parseChangelog(content: string): VersionSection[] {
  if (!content?.trim()) return [];

  const parts = content.split(/^## /m);
  const versions: VersionSection[] = [];

  for (let i = 1; i < parts.length; i++) {
    const section = parts[i]?.trim();
    if (!section) continue;

    const firstNewline = section.indexOf("\n");
    const title = (
      firstNewline === -1 ? section : section.slice(0, firstNewline)
    ).trim();
    const body = (firstNewline === -1 ? "" : section.slice(firstNewline))
      .trim()
      .replace(/\r?\n\r?\n/g, "\n");

    if (title) {
      versions.push({
        title,
        content: `### ${title}\n\n${body}`,
      });
    }
  }

  return versions;
}
