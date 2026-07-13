import { EmbedBuilder } from "discord.js";
import { Worker } from "node:worker_threads";
import type { CommandCallbackOpts } from "../../types/command.ts";

const MAX_PATTERN = 200;
const MAX_TEXT = 2000;
const MAX_MATCHES = 50;
const MATCH_TIMEOUT_MS = 100;

type MatchResult = { match: string; index: number };

/** Reject patterns that commonly enable catastrophic backtracking. */
function isDangerousPattern(pattern: string): boolean {
  // Nested quantifiers on groups/classes: (a+)+, (a*)*, [a]+{2,}, etc.
  if (/\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)(?:[+*?]|\{\d)/.test(pattern)) {
    return true;
  }
  // Quantified alternation groups: (a|a)+ / (a|ab)*
  if (/\((?:[^()\\]|\\.)*\|(?:[^()\\]|\\.)*\)(?:[+*?]|\{\d)/.test(pattern)) {
    return true;
  }
  // Very large explicit repetition bounds
  if (/\{\d{3,}/.test(pattern)) return true;
  // Too many quantifiers overall
  const quantifiers = pattern.match(/[*+?]|\{\d+,?\d*\}/g);
  if (quantifiers && quantifiers.length > 15) return true;
  return false;
}

function matchWithTimeout(
  pattern: string,
  text: string,
  maxMatches: number,
  timeoutMs: number,
): Promise<MatchResult[]> {
  return new Promise((resolve, reject) => {
    // CommonJS eval worker so matching never blocks the bot event loop.
    const workerSource = `
      const { parentPort, workerData } = require("node:worker_threads");
      try {
        const re = new RegExp(workerData.pattern, "g");
        const results = [];
        let m;
        while ((m = re.exec(workerData.text)) !== null) {
          results.push({ match: m[0], index: m.index || 0 });
          if (results.length >= workerData.maxMatches) break;
          if (m[0].length === 0) {
            re.lastIndex++;
            if (re.lastIndex > workerData.text.length) break;
          }
        }
        parentPort.postMessage({ ok: true, results });
      } catch (err) {
        parentPort.postMessage({
          ok: false,
          error: err && err.message ? String(err.message) : "Invalid regex",
        });
      }
    `;

    let settled = false;
    const worker = new Worker(workerSource, {
      eval: true,
      workerData: { pattern, text, maxMatches },
    });

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      fn();
    };

    const timer = setTimeout(() => {
      finish(() => reject(new Error("timeout")));
    }, timeoutMs);

    worker.on(
      "message",
      (msg: { ok: boolean; results?: MatchResult[]; error?: string }) => {
        finish(() => {
          if (msg.ok) resolve(msg.results ?? []);
          else reject(new Error(msg.error || "regex error"));
        });
      },
    );

    worker.on("error", (err) => {
      finish(() => reject(err));
    });

    worker.on("exit", (code) => {
      finish(() => {
        if (code !== 0) reject(new Error("worker exited unexpectedly"));
      });
    });
  });
}

export default {
  name: "regex",
  description: "Test and analyze regex patterns",
  usage: "regex <pattern> | <text>",
  aliases: ["regexp"],
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      let pattern = args[0];
      const text = args.slice(2).join(" ") || args[1] || "";

      if (!pattern || !text) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`❌ Regex error`)
              .setDescription(
                "Usage: `;regex <pattern> | <text>`\nExample: `;regex \\d+ | hello123 world456`",
              )
              .setColor(0xd21872),
          ],
        });
      }

      if (pattern.startsWith("/") && pattern.endsWith("/")) {
        pattern = pattern.slice(1, -1);
      }

      if (pattern.length > MAX_PATTERN || text.length > MAX_TEXT) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`❌ Input too long`)
              .setDescription(
                `Pattern max ${MAX_PATTERN} chars, text max ${MAX_TEXT} chars.`,
              )
              .setColor(0xd21872),
          ],
        });
      }

      if (isDangerousPattern(pattern)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`❌ Pattern not allowed`)
              .setDescription(
                "This pattern looks too complex or prone to catastrophic backtracking.",
              )
              .setColor(0xd21872),
          ],
        });
      }

      // Validate syntax on the main thread (cheap) before spawning a worker.
      try {
        new RegExp(pattern, "g");
      } catch {
        return message.reply({
          embeds: [
            new EmbedBuilder().setTitle(`❌ Invalid regex`).setColor(0xd21872),
          ],
        });
      }

      let matches: MatchResult[];
      try {
        matches = await matchWithTimeout(
          pattern,
          text,
          MAX_MATCHES,
          MATCH_TIMEOUT_MS,
        );
      } catch (err) {
        if (err instanceof Error && err.message === "timeout") {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`❌ Regex timed out`)
                .setDescription(
                  "Matching took too long and was aborted. Try a simpler pattern or shorter text.",
                )
                .setColor(0xd21872),
            ],
          });
        }
        return message.reply({
          embeds: [
            new EmbedBuilder().setTitle(`❌ Invalid regex`).setColor(0xd21872),
          ],
        });
      }

      if (matches.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`❌ No matches`)
              .setDescription(`Pattern: \`${pattern}\`\nText: \`${text}\``)
              .setColor(0xf59e0b),
          ],
        });
      }

      let highlighted = text;
      matches.forEach((m) => {
        highlighted = highlighted.replace(m.match, `**${m.match}**`);
      });

      const matchDetails = matches
        .slice(0, 5)
        .map((m, i) => `#${i + 1} → \`${m.match}\` (index: ${m.index})`)
        .join("\n");

      const matchCountLabel =
        matches.length >= MAX_MATCHES
          ? `${matches.length}+ (capped at ${MAX_MATCHES})`
          : `${matches.length}`;

      const embed = new EmbedBuilder()
        .setTitle(`✅ Regex Matches`)
        .setFields(
          { name: "Pattern", value: `\`${pattern}\`` },
          { name: "Matches Found", value: matchCountLabel },
          { name: "Highlighted Text", value: highlighted.slice(0, 1024) },
          { name: "Match Details", value: matchDetails || "N/A" },
        )
        .setColor(0x22c55e);

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Regex error")
            .setDescription("An error occurred while processing the regex.")
            .setColor(0xd21872),
        ],
      });
    }
  },
};
