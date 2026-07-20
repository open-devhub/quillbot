import { createCanvas } from "@napi-rs/canvas";

const CELL_SIZE = 10;
const GAP = 3;
const ROWS = 7;

const COLORS = {
  cellEmpty: "#161b22",
  ramp: ["#0e4429", "#006d32", "#26a641", "#39d353"],
};

function roundRectPath(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function cellColor(level: number): string {
  if (!level || level <= 0) return COLORS.cellEmpty;
  const index = Math.min(COLORS.ramp.length - 1, level - 1);
  return COLORS.ramp[index]!;
}

interface Heatmap {
  columns: number[][];
  max: number;
}

interface JogruberDay {
  date: string;
  count: number;
  level: number;
}

interface JogruberResponse {
  total?: Record<string, number>;
  contributions?: JogruberDay[];
  error?: string;
}

/**
 * Fetches the contribution calendar from the third-party
 * github-contributions-api (jogruber.de) instead of GitHub directly.
 * No token, no scraping, no GitHub rate limit involvement at all —
 * this service does the GitHub GraphQL call on its own end and caches it.
 *
 * Note: this is still a dependency on someone else's free public service,
 * not GitHub itself, so it has its own (undocumented) availability/rate
 * characteristics. Worth keeping the caching layer in front of it regardless.
 */
async function fetchContributionData(username: string): Promise<Heatmap> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  let res: Response;
  try {
    res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`,
      {
        headers: { "User-Agent": "github-heatmap-generator" },
        signal: controller.signal,
      },
    );
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "github-contributions-api timed out after 10s — the service may be down or slow",
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`github-contributions-api request failed: ${res.status}`);
  }

  const json: JogruberResponse = await res.json();

  if (json.error) {
    throw new Error(`github-contributions-api error: ${json.error}`);
  }
  if (!json.contributions || json.contributions.length === 0) {
    throw new Error("No contribution data returned");
  }

  const days = [...json.contributions].sort((a, b) =>
    a.date < b.date ? -1 : 1,
  );

  const columns: number[][] = [];
  let currentWeek: number[] = [];
  for (const day of days) {
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
    if (weekday === 0 && currentWeek.length > 0) {
      columns.push(currentWeek);
      currentWeek = [];
    }
    currentWeek[weekday] = day.level;
  }
  if (currentWeek.length > 0) columns.push(currentWeek);

  return { columns, max: 4 };
}

/**
 * Generates a GitHub-style contribution heatmap image for a given username.
 * No text/labels are drawn — just the colored cell grid.
 *
 * Flow: fetch the user's contribution graph -> render it.
 * Data source: github-contributions-api.jogruber.de (no token required).
 *
 * @returns PNG image buffer
 */
export async function generateGitHubHeatMap(username: string): Promise<Buffer> {
  if (!username || typeof username !== "string") {
    throw new Error("username is required");
  }

  const heatmap = await fetchContributionData(username);

  const weeks = heatmap.columns.length;
  const rows = ROWS;

  const width = weeks * CELL_SIZE + (weeks - 1) * GAP;
  const height = rows * CELL_SIZE + (rows - 1) * GAP;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const radius = Math.max(1, CELL_SIZE * 0.25);

  for (let c = 0; c < weeks; c++) {
    const week = heatmap.columns[c] || [];
    for (let r = 0; r < rows; r++) {
      const level = week[r] || 0;
      const x = c * (CELL_SIZE + GAP);
      const y = r * (CELL_SIZE + GAP);
      ctx.fillStyle = cellColor(level);
      roundRectPath(ctx, x, y, CELL_SIZE, CELL_SIZE, radius);
      ctx.fill();
    }
  }

  return canvas.toBuffer("image/png");
}
