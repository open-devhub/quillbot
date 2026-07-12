import { EmbedBuilder } from "discord.js";
import dns from "node:dns/promises";
import net from "node:net";
import type { CommandCallbackOpts } from "../../types/command.ts";

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
    const v4 = groups.pop()!.split(".").map((x) => Number(x));
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
      if (a === 0) return true; // 0.0.0.0/8
      if (a === 10) return true; // 10.0.0.0/8
      if (a === 127) return true; // 127.0.0.0/8
      if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / metadata
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
      if (a === 192 && b === 168) return true; // 192.168.0.0/16
      if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
      if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmark
      if (a >= 224) return true; // multicast + reserved
      return false;
    }

    if (net.isIPv6(ip)) {
      const n = ipv6ToBigInt(ip);

      // ::/128 unspecified, ::1/128 loopback
      if (n === 0n || n === 1n) return true;

      // ::ffff:0:0/96 IPv4-mapped
      if (n >> 32n === 0xffffn) {
        const v4 = Number(n & 0xffffffffn);
        const a = (v4 >>> 24) & 0xff;
        const b = (v4 >>> 16) & 0xff;
        const c = (v4 >>> 8) & 0xff;
        const d = v4 & 0xff;
        return isBlockedIp(`${a}.${b}.${c}.${d}`);
      }

      // fe80::/10 link-local
      if (n >> 118n === 0x3fan) return true;
      // fc00::/7 unique local
      if (n >> 121n === 0x7en) return true;
      // ff00::/8 multicast
      if (n >> 120n === 0xffn) return true;
      // 2001:db8::/32 documentation
      if (n >> 96n === 0x20010db8n) return true;

      return false;
    }

    return true;
  } catch {
    return true;
  }
}

async function assertSafeUrl(raw: string): Promise<URL> {
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

  const host = u.hostname;
  const hostLower = host.toLowerCase();
  if (
    hostLower === "localhost" ||
    hostLower.endsWith(".localhost") ||
    hostLower.endsWith(".local") ||
    hostLower === "metadata.google.internal"
  ) {
    throw new Error("Requests to private or local addresses are not allowed.");
  }

  if (net.isIP(host)) {
    if (isBlockedIp(host)) {
      throw new Error("Requests to private or local addresses are not allowed.");
    }
  } else {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    if (!records.length || records.some((r) => isBlockedIp(r.address))) {
      throw new Error("Requests to private or local addresses are not allowed.");
    }
  }

  return u;
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

    const safe = (input: string, limit = 900) => {
      if (typeof input !== "string") {
        input = JSON.stringify(input, null, 2);
      }
      return input.length > limit
        ? input.slice(0, limit) + "\n... (truncated)"
        : input;
    };

    try {
      if (!url) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Invalid URL")
              .setDescription(
                "Please provide a valid URL starting with http:// or https://",
              )
              .setColor(0xd21872),
          ],
        });
      }

      let safeUrl: URL;
      try {
        safeUrl = await assertSafeUrl(url);
      } catch (e) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ URL not allowed")
              .setDescription(
                e instanceof Error
                  ? e.message
                  : "The provided URL is not allowed.",
              )
              .setColor(0xd21872),
          ],
        });
      }

      if (!validMethods.includes(method)) {
        return message.reply(`Invalid method: ${validMethods.join(", ")}`);
      }

      let body;
      if (rawBody?.trim()) {
        try {
          body = JSON.stringify(JSON.parse(rawBody));
        } catch {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ Invalid JSON body")
                .setDescription(
                  "Please provide valid JSON for the request body.",
                )
                .setColor(0xd21872),
            ],
          });
        }
      }

      const res = await fetch(safeUrl.href, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });

      const duration = Date.now() - start;

      const text = await res.text();

      let parsed;
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

      const embed = new EmbedBuilder()
        .setTitle(`${res.status} ${res.statusText || "Status"}`)
        .addFields(
          {
            name: "Request",
            value: `${method} ${safeUrl.href}`.slice(0, 1024),
          },
          {
            name: "Latency",
            value: `${duration}ms`,
            inline: true,
          },
          {
            name: "Content-Type",
            value: (res.headers.get("content-type") || "unknown").slice(
              0,
              1024,
            ),
            inline: true,
          },
          {
            name: "Status Type",
            value: res.statusText || "Unknown",
            inline: true,
          },
          {
            name: "Headers",
            value:
              "```json\n" +
              safe(JSON.stringify(filteredHeaders, null, 2), 500) +
              "\n```",
          },
          {
            name: "Response Body",
            value: "```json\n" + safe(parsed) + "\n```",
          },
        )
        .setColor(
          res.status >= 200 && res.status < 300
            ? 0x2ecc71
            : res.status >= 300 && res.status < 400
              ? 0x3498db
              : res.status >= 400 && res.status < 500
                ? 0xf1c40f
                : 0xe74c3c,
        )
        .setFooter({ text: "Quill HTTP Inspector" });

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Request failed")
            .setDescription("The request failed (network or timeout error).")
            .setColor(0xd21872),
        ],
      });
    }
  },
};
