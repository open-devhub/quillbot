import { MessageFlags } from "discord.js";
import "dotenv/config";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

const GSB_API_KEY = process.env.GSB_API_KEY;
const URLSCAN_API_KEY = process.env.URLSCAN_API_KEY;
const IPQUALITYSCORE_API_KEY = process.env.IPQUALITYSCORE_API_KEY;

// known ip loggers
const KNOWN_MALICIOUS_DOMAINS = new Set([
  "grabify.link",
  "iplogger.org",
  "iplogger.com",
  "iplogger.ru",
  "iplogger.info",
  "2no.co",
  "blasze.com",
  "blasze.tk",
  "yip.su",
  "ps3cfw.com",
  "stopmodreposts.tk",
  "leancoding.co",
  "spottyfly.com",
  "curiousfox.com",
  "webresolver.nl",

  // test
  // "google.com",
]);

const MAX_REDIRECTS = 10;
const REDIRECT_TIMEOUT_MS = 6000;
const URLSCAN_POLL_ATTEMPTS = 5;
const URLSCAN_POLL_DELAY_MS = 3000;

interface RedirectChainResult {
  chain: string[];
  blocked: { domain: string; url: string } | null;
}

interface GSBResult {
  malicious: boolean;
  threats: string[];
}

interface URLScanResult {
  malicious: boolean;
  suspicious: boolean;
  score: number | null;
  ip: string | null;
  country: string | null;
  asn: string | null;
  server: string | null;
  resultUrl: string;
}

interface IPQSResult {
  malicious: boolean;
  suspicious: boolean;
  unsafe: boolean;
  risk_score: number | null;
  fraud_score: number | null;
  host: string | null;
  country_code: string | null;
}

export default {
  name: "scan",
  description: "Check if a URL is sus",
  usage: "scan <url | message link>",
  aliases: ["checkurl", "urlscan"],
  premium: true,
  async callback({ client, message, args }: CommandCallbackOpts) {
    const url: string | undefined = args[0];

    if (!url) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ No URL Provided",
          description: "Please provide a URL to scan.\nUsage: `;scan <url>`",
        }),
      });
    }

    let scanUrl: string = url;
    if (!/^https?:\/\//.test(scanUrl)) {
      scanUrl = "http://" + scanUrl;
    }

    if (
      /^https?:\/\/(www\.)?discord\.com\/channels\/\d+\/\d+\/\d+/.test(scanUrl)
    ) {
      const match = url.match(
        /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/,
      );
      if (!match || !match[1] || !match[2] || !match[3]) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Invalid Message Link",
            description:
              "Please provide a valid Discord message link containing a URL (and make sure the bot has access to that message).",
          }),
        });
      }
      const [, guildId, channelId, messageId] = match;

      try {
        if (!guildId || !channelId || !messageId) {
          throw new Error("Invalid message link");
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) throw new Error("Guild not found");

        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) throw new Error("Channel not found");

        const msg = await channel.messages.fetch(messageId);
        const urls = Array.from(msg.content.matchAll(/https?:\/\/[^\s]+/g)).map(
          (m) => m[0],
        );

        if (urls.length === 0) {
          return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: buildErrorComponent({
              title: "❌ No URLs Found",
              description:
                "The linked message does not contain any URLs to scan.",
            }),
          });
        }

        scanUrl = urls[0] ?? scanUrl;
      } catch (err) {
        console.error("Failed to fetch linked message:", err);
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Invalid Message Link",
            description:
              "Please provide a valid Discord message link containing a URL (and make sure the bot has access to that message).",
          }),
        });
      }
    }

    try {
      new URL(scanUrl);
    } catch {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Invalid URL",
          description:
            "Please provide a valid URL including `http://` or `https://`",
        }),
      });
    }

    const loading = await message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: buildComponents([
        {
          type: "container",
          accentColor: 0x5865f2,
          components: [
            { type: "text", content: "### 🔍 Scanning URL..." },
            {
              type: "text",
              content:
                "Resolving redirects and running deep analysis, this may take a few seconds...",
            },
          ],
        },
      ]),
    });

    try {
      // check redirects
      const { chain, blocked } = await resolveRedirectChain(scanUrl);

      if (blocked) {
        const blockedParts: any[] = [
          { type: "text", content: "### 🚨 DANGEROUS" },
          {
            type: "text",
            content: `> This URL redirects to **${blocked.domain}**, a known IP logger/grabber service. Do **NOT** visit it.`,
          },
          {
            type: "text",
            content: `**URL**\n\`\`\`\n${scanUrl}\n\`\`\``,
          },
          {
            type: "text",
            content: `**Flagged Redirect**\n\`${blocked.url}\``,
          },
        ];

        if (chain.length > 1) {
          blockedParts.push({
            type: "text",
            content: `**Redirect Chain**\n${chain
              .map((c, i) => `${i + 1}. \`${c}\``)
              .join("\n")}`,
          });
        }

        blockedParts.push(
          { type: "separator", spacing: "small" },
          {
            type: "text",
            content: `-# Requested by ${message.author.tag} • Blocked by internal list, no external scans were run`,
          },
        );

        return loading.edit({
          components: buildComponents([
            {
              type: "container",
              accentColor: 0xff3333,
              components: blockedParts,
            },
          ]),
        });
      }

      // if it's not in the url blacklist, check against gsb, urlscan.io and ipqs
      const [gsbResult, urlscanResult, ipqsResult] = await Promise.allSettled([
        runGSB(scanUrl),
        runURLScan(scanUrl),
        runIPQualityScore(scanUrl),
      ]);

      const gsb = gsbResult.status === "fulfilled" ? gsbResult.value : null;
      const urlscan =
        urlscanResult.status === "fulfilled" ? urlscanResult.value : null;
      const ipqs = ipqsResult.status === "fulfilled" ? ipqsResult.value : null;

      const isIPQSMalicious =
        !!ipqs &&
        (ipqs.malicious || ipqs.unsafe || (ipqs.fraud_score ?? 0) >= 85);
      const isIPQSSuspicious =
        !isIPQSMalicious &&
        !!ipqs &&
        (ipqs.suspicious || (ipqs.risk_score ?? 0) >= 70);
      const isMalicious = !!gsb?.malicious || isIPQSMalicious;
      const isSuspicious =
        !isMalicious && ((urlscan?.score ?? 0) >= 70 || isIPQSSuspicious);

      let color: number;
      let badge: string;
      let verdictLine: string;

      if (isMalicious) {
        color = 0xff3333;
        badge = "🚨 DANGEROUS";
        verdictLine = isIPQSMalicious
          ? "This URL is flagged by IPQualityScore as malicious. Do **NOT** visit it."
          : "This URL has been flagged as **malicious**. Do **NOT** visit it.";
      } else if (isSuspicious) {
        color = 0xff9900;
        badge = "⚠️ SUSPICIOUS";
        verdictLine = ipqs?.suspicious
          ? "IPQualityScore flagged this URL as suspicious. Proceed with caution."
          : "This URL shows **suspicious behavior**. Proceed with caution.";
      } else {
        color = 0x57f287;
        badge = "✅ CLEAN";
        verdictLine = "No threats detected. This URL appears to be safe.";
      }

      const domain = new URL(scanUrl).hostname;

      const parts: any[] = [
        { type: "text", content: `### ${badge}` },
        { type: "text", content: `> ${verdictLine}` },
        {
          type: "text",
          content: `**URL**\n\`\`\`\n${scanUrl}\n\`\`\``,
        },
      ];

      if (chain.length > 1) {
        parts.push({
          type: "text",
          content: `**Redirect Chain**\n${chain
            .map((c, i) => `${i + 1}. \`${c}\``)
            .join("\n")}`,
        });
      }

      if (gsb?.malicious && gsb.threats.length > 0) {
        parts.push({
          type: "text",
          content: `**Threats Detected**\n${gsb.threats.map((t) => `• ${t}`).join("\n")}`,
        });
      }

      const infoLines: string[] = [];
      if (domain) infoLines.push(`**Domain:** \`${domain}\``);
      if (urlscan?.ip) infoLines.push(`**IP Address:** \`${urlscan.ip}\``);
      if (urlscan?.country)
        infoLines.push(`**Server Location:** \`${urlscan.country}\``);
      if (urlscan?.asn) infoLines.push(`**ASN:** \`${urlscan.asn}\``);
      if (urlscan?.server) infoLines.push(`**Server:** \`${urlscan.server}\``);

      if (infoLines.length > 0) {
        parts.push({
          type: "text",
          content: `**Site Information**\n${infoLines.join("\n")}`,
        });
      }

      if (urlscan?.score != null) {
        const score = urlscan.score;
        const filled = Math.round(score / 10);
        const empty = 10 - filled;
        const bar = "█".repeat(filled) + "░".repeat(empty);
        const scoreColor = score >= 70 ? "🔴" : score >= 40 ? "🟡" : "🟢";
        parts.push({
          type: "text",
          content: `**Risk Score**\n${scoreColor} \`${bar}\` **${score}/100**`,
        });
      }

      const sources: string[] = ["Internal Blocklist"];
      if (gsb) sources.push("Google Safe Browsing");
      if (urlscan) sources.push("URLScan.io");
      if (ipqs) sources.push("IPQualityScore");

      parts.push({
        type: "text",
        content: `**Scanned Against**\n${sources.map((s) => `• ${s}`).join("\n")}`,
      });

      parts.push({ type: "separator", spacing: "small" });

      if (urlscan?.resultUrl) {
        parts.push({
          type: "section",
          components: [
            {
              type: "text",
              content: `-# Requested by ${message.author.tag}`,
            },
          ],
          accessory: {
            type: "button",
            style: "link",
            label: "Full Report",
            url: urlscan.resultUrl,
          },
        });
      } else {
        parts.push({
          type: "text",
          content: `-# Requested by ${message.author.tag}`,
        });
      }

      return loading.edit({
        components: buildComponents([
          {
            type: "container",
            accentColor: color,
            components: parts,
          },
        ]),
      });
    } catch (err) {
      console.error(err);
      return loading.edit({
        components: buildErrorComponent({
          title: "❌ Scan Failed",
          description: "Something went wrong while scanning. Try again later.",
        }),
      });
    }
  },
};

async function resolveRedirectChain(
  startUrl: string,
): Promise<RedirectChainResult> {
  const chain: string[] = [startUrl];
  let current = startUrl;

  const initialBlock = checkDomain(startUrl);
  if (initialBlock) return { chain, blocked: initialBlock };

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REDIRECT_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DevHubScanner/1.0)",
        },
      });
    } catch {
      clearTimeout(timeout);
      break;
    }
    clearTimeout(timeout);

    //  final destination
    if (res.status < 300 || res.status >= 400) break;

    const location = res.headers.get("location");
    if (!location) break;

    let nextUrl: string;
    try {
      nextUrl = new URL(location, current).toString();
    } catch {
      break;
    }

    if (chain.includes(nextUrl)) break;

    chain.push(nextUrl);

    const blocked = checkDomain(nextUrl);
    if (blocked) return { chain, blocked };

    current = nextUrl;
  }

  return { chain, blocked: null };
}

function checkDomain(urlStr: string): { domain: string; url: string } | null {
  let hostname: string;
  try {
    hostname = new URL(urlStr).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }

  for (const blocked of KNOWN_MALICIOUS_DOMAINS) {
    if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
      return { domain: blocked, url: urlStr };
    }
  }

  return null;
}

async function runGSB(url: string): Promise<GSBResult> {
  const res = await fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GSB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "discord-bot", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: [
            "MALWARE",
            "SOCIAL_ENGINEERING",
            "UNWANTED_SOFTWARE",
            "POTENTIALLY_HARMFUL_APPLICATION",
          ],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
    },
  );

  const data = await res.json();
  const matches = (data.matches ?? []) as Array<{ threatType: string }>;

  return {
    malicious: matches.length > 0,
    threats: matches.map((m) => m.threatType.replace(/_/g, " ")),
  };
}

async function runURLScan(url: string): Promise<URLScanResult | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (URLSCAN_API_KEY) headers["API-Key"] = URLSCAN_API_KEY;

  const submit = await fetch("https://urlscan.io/api/v1/scan/", {
    method: "POST",
    headers,
    body: JSON.stringify({ url, visibility: "public" }),
  });

  const submitData = await submit.json();
  if (!submitData.uuid) return null;

  for (let i = 0; i < URLSCAN_POLL_ATTEMPTS; i++) {
    await sleep(URLSCAN_POLL_DELAY_MS);

    const result = await fetch(
      `https://urlscan.io/api/v1/result/${submitData.uuid}/`,
      { headers },
    );

    if (result.status === 403) {
      console.log(
        "URLScan result fetch forbidden (403). Check API key and permissions.",
      );
      return null;
    }
    if (result.status === 404) continue;
    if (!result.ok) continue;

    const data = await result.json();
    const verdict = data.verdicts?.overall;

    return {
      malicious: verdict?.malicious ?? false,
      suspicious: (verdict?.score ?? 0) >= 70 && !verdict?.malicious,
      score: verdict?.score ?? null,
      ip: data.page?.ip ?? null,
      country: data.page?.country ?? null,
      asn: data.page?.asnname ?? null,
      server: data.page?.server ?? null,
      resultUrl: `https://urlscan.io/result/${submitData.uuid}/`,
    };
  }

  return null;
}

async function runIPQualityScore(url: string): Promise<IPQSResult | null> {
  if (!IPQUALITYSCORE_API_KEY) return null;

  const endpoint = `https://ipqualityscore.com/api/json/url/${IPQUALITYSCORE_API_KEY}/${encodeURIComponent(
    url,
  )}?strictness=0&fast=true`;

  const res = await fetch(endpoint, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    console.log("IPQualityScore fetch failed", res.status);
    return null;
  }

  const data = await res.json();
  if (data.success === false) {
    console.log("IPQualityScore API returned failure", data);
    return null;
  }

  return {
    malicious: data.malicious ?? false,
    suspicious: data.suspicious ?? false,
    unsafe: data.unsafe ?? false,
    risk_score: data.risk_score ?? null,
    fraud_score: data.fraud_score ?? null,
    host: data.host ?? null,
    country_code: data.country_code ?? null,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
