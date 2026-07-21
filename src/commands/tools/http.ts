import { MessageFlags } from "discord.js";
import fetch from "node-fetch";
import dns from "node:dns/promises";
import net from "node:net";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

function ipv6ToBigInt(ip: string): bigint {
  let full = ip.toLowerCase();
  if (full.includes("%")) full = full.slice(0, full.indexOf("%"));

  const sides = full.split("::");
  let groups: string[];
  if (sides.length === 2) {
    const left = sides[0] ? sides[0].split(":") : [];
    const right = sides[1] ? sides[1].split(":") : [];
    const fill = 8 - left.length - right.length;
    groups = [...left, ...Array(Math.max(0, fill)).fill("0"), ...right];
  } else {
    groups = full.split(":");
  }

  if (groups.length > 0 && groups[groups.length - 1]!.includes(".")) {
    const v4 = groups
      .pop()!
      .split(".")
      .map((x) => Number(x));
    groups.push(((v4[0]! << 8) | v4[1]!).toString(16));
    groups.push(((v4[2]! << 8) | v4[3]!).toString(16));
  }

  while (groups.length < 8) groups.push("0");
  return groups
    .slice(0, 8)
    .reduce((acc, g) => (acc << 16n) + BigInt(parseInt(g || "0", 16)), 0n);
}

function isBlockedIp(ip: string): boolean {
  try {
    if (net.isIPv4(ip)) {
      const parts = ip.split(".").map((x) => Number(x));
      const a = parts[0];
      const b = parts[1];
      if (a === undefined || b === undefined) return true;
      if (a === 0) return true;
      if (a === 10) return true;
      if (a === 127) return true;
      if (a === 169 && b === 254) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 100 && b >= 64 && b <= 127) return true;
      if (a === 198 && (b === 18 || b === 19)) return true;
      if (a >= 224) return true;
      return false;
    }

    if (net.isIPv6(ip)) {
      const n = ipv6ToBigInt(ip);

      if (n === 0n || n === 1n) return true;

      if (n >> 32n === 0xffffn) {
        const v4 = Number(n & 0xffffffffn);
        const a = (v4 >>> 24) & 0xff;
        const b = (v4 >>> 16) & 0xff;
        const c = (v4 >>> 8) & 0xff;
        const d = v4 & 0xff;
        return isBlockedIp(`${a}.${b}.${c}.${d}`);
      }

      if (n >> 118n === 0x3fan) return true;
      if (n >> 121n === 0x7en) return true;
      if (n >> 120n === 0xffn) return true;
      if (n >> 96n === 0x20010db8n) return true;

      return false;
    }

    return true;
  } catch {
    return true;
  }
}

function isSuspiciousNumericHost(host: string): boolean {
  if (net.isIP(host)) return false;
  if (/^0x[0-9a-f]+$/i.test(host)) return true;
  if (/^\d+$/.test(host)) return true;
  if (/^0[0-7]+(\.[0-9]+){0,3}$/.test(host)) return true;
  return false;
}

function stripBrackets(hostname: string): string {
  return hostname.replace(/^\[/, "").replace(/\]$/, "");
}

interface SafeUrlResult {
  url: URL;
  host: string;
  pinnedIp: string;
  family: 4 | 6;
}

async function assertSafeUrl(raw: string): Promise<SafeUrlResult> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(
      "Please provide a valid URL starting with http:// or https://",
    );
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are allowed.");
  }
  if (u.username || u.password) {
    throw new Error("URLs with embedded credentials are not allowed.");
  }

  const host = stripBrackets(u.hostname);
  const hostLower = host.toLowerCase();
  if (
    hostLower === "localhost" ||
    hostLower.endsWith(".localhost") ||
    hostLower.endsWith(".local") ||
    hostLower === "metadata.google.internal"
  ) {
    throw new Error("Requests to private or local addresses are not allowed.");
  }

  if (isSuspiciousNumericHost(host)) {
    throw new Error(
      "IP addresses must be in standard dotted or bracketed form.",
    );
  }

  if (net.isIP(host)) {
    if (isBlockedIp(host)) {
      throw new Error(
        "Requests to private or local addresses are not allowed.",
      );
    }
    return {
      url: u,
      host,
      pinnedIp: host,
      family: net.isIPv6(host) ? 6 : 4,
    };
  }

  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some((r) => isBlockedIp(r.address))) {
    throw new Error("Requests to private or local addresses are not allowed.");
  }

  const chosen = records[0]!;
  return {
    url: u,
    host,
    pinnedIp: chosen.address,
    family: chosen.family === 6 ? 6 : 4,
  };
}

function pinnedLookup(pinnedIp: string, family: 4 | 6) {
  return (
    _hostname: string,
    options: unknown,
    callback: (
      err: NodeJS.ErrnoException | null,
      address: string,
      family: number,
    ) => void,
  ) => {
    callback(null, pinnedIp, family);
  };
}

async function readBodyWithLimit(
  res: Awaited<ReturnType<typeof fetch>>,
  maxBytes: number,
): Promise<{ text: string; truncated: boolean }> {
  const reader = res.body;
  if (!reader) return { text: "", truncated: false };

  let total = 0;
  let truncated = false;
  const chunks: Buffer[] = [];

  for await (const chunk of reader as AsyncIterable<Buffer>) {
    total += chunk.length;
    if (total > maxBytes) {
      truncated = true;
      const remaining = maxBytes - (total - chunk.length);
      if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
      break;
    }
    chunks.push(chunk);
  }

  return { text: Buffer.concat(chunks).toString("utf8"), truncated };
}

export default {
  name: "http",
  description: "Make HTTP requests and inspect responses",
  usage:
    "http <url> [method]\n<optional JSON body for POST/PUT/PATCH in code block>",
  aliases: ["postman", "fetch", "insomnia"],

  async callback({ message, args }: CommandCallbackOpts) {
    const url = args[0];
    const method = (args[1] || "GET").toUpperCase();

    const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    const importantHeaders = [
      "content-type",
      "content-length",
      "cache-control",
      "etag",
      "date",
      "server",
      "x-ratelimit-limit",
      "x-ratelimit-remaining",
      "x-ratelimit-reset",
      "retry-after",
      "x-request-id",
      "x-github-request-id",
      "cf-ray",
    ];
    const rawBody = message.content.split("```").slice(1, -1).join("```");

    const start = Date.now();

    const safe = (input: unknown, limit = 900): string => {
      const str =
        typeof input === "string" ? input : JSON.stringify(input, null, 2);
      return str.length > limit
        ? str.slice(0, limit) + "\n... (truncated)"
        : str;
    };

    const errorReply = (title: string, description: string) =>
      message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({ title, description }),
      });

    try {
      if (!url) {
        return errorReply(
          "❌ Invalid URL",
          "Please provide a valid URL starting with http:// or https://",
        );
      }
      if (!validMethods.includes(method)) {
        return errorReply(
          "❌ Invalid Method",
          `Allowed methods: ${validMethods.join(", ")}`,
        );
      }

      let body: string | undefined;
      if (rawBody?.trim()) {
        try {
          body = JSON.stringify(JSON.parse(rawBody));
        } catch {
          return errorReply(
            "❌ Invalid JSON Body",
            "Please provide valid JSON for the request body.",
          );
        }
      }

      let currentUrl = url;
      let finalUrl: URL | undefined;
      let res: Awaited<ReturnType<typeof fetch>> | undefined;

      for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        let safeUrl: SafeUrlResult;
        try {
          safeUrl = await assertSafeUrl(currentUrl);
        } catch (e) {
          return errorReply(
            "❌ URL Not Allowed",
            e instanceof Error ? e.message : "The provided URL is not allowed.",
          );
        }

        res = await fetch(safeUrl.url.href, {
          method,
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: hop === 0 ? body : undefined,
          redirect: "manual",
          signal: AbortSignal.timeout(
            REQUEST_TIMEOUT_MS,
          ) as unknown as import("node-fetch").RequestInit["signal"],
          lookup: pinnedLookup(safeUrl.pinnedIp, safeUrl.family),
        } as import("node-fetch").RequestInit);

        finalUrl = safeUrl.url;

        const isRedirect = res.status >= 300 && res.status < 400;
        const location = res.headers.get("location");
        if (isRedirect && location && hop < MAX_REDIRECTS) {
          currentUrl = new URL(location, safeUrl.url).href;
          continue;
        }
        break;
      }

      if (!res || !finalUrl) {
        return errorReply(
          "❌ Request Failed",
          "The request failed unexpectedly.",
        );
      }

      const duration = Date.now() - start;
      const { text, truncated } = await readBodyWithLimit(res, MAX_BODY_BYTES);

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      const filteredHeaders: Record<string, string> = {};
      for (const [key, value] of res.headers.entries()) {
        if (importantHeaders.includes(key.toLowerCase())) {
          filteredHeaders[key] = value;
        }
      }

      const bodyValue =
        "```json\n" +
        safe(parsed) +
        (truncated ? "\n... (response body truncated, exceeded 2MB)" : "") +
        "\n```";

      const headersValue =
        "```json\n" +
        safe(JSON.stringify(filteredHeaders, null, 2), 500) +
        "\n```";

      const accentColor =
        res.status >= 200 && res.status < 300
          ? 0x2ecc71
          : res.status >= 300 && res.status < 400
            ? 0x3498db
            : res.status >= 400 && res.status < 500
              ? 0xf1c40f
              : 0xe74c3c;

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor,
            components: [
              {
                type: "text",
                content: `### ${res.status} ${res.statusText || "Status"}`,
              },
              {
                type: "text",
                content: `**Request**\n\`${method} ${finalUrl.href}\``.slice(
                  0,
                  1024,
                ),
              },
              {
                type: "text",
                content: [
                  `**Latency**: \`${duration}ms\``,
                  `**Content-Type**: \`${(res.headers.get("content-type") || "unknown").slice(0, 200)}\``,
                  `**Status Type**: \`${res.statusText || "Unknown"}\``,
                ].join("\n"),
              },
              { type: "separator", spacing: "small", divider: false },
              {
                type: "text",
                content: `**Headers**\n${headersValue}`,
              },
              {
                type: "text",
                content: `**Response Body**\n${bodyValue}`,
              },
              { type: "separator", spacing: "small" },
              {
                type: "text",
                content: "-# Quill HTTP Inspector",
              },
            ],
          },
        ]),
      });
    } catch (err) {
      console.error(err);
      return errorReply(
        "❌ Request Failed",
        "The request failed (network or timeout error).",
      );
    }
  },
};
