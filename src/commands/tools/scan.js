import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import "dotenv/config";

const GSB_API_KEY = process.env.GSB_API_KEY;
const URLSCAN_API_KEY = process.env.URLSCAN_API_KEY;
const IPQUALITYSCORE_API_KEY = process.env.IPQUALITYSCORE_API_KEY;

export default {
  name: "scan",
  description: "Check if a URL is sus",
  usage: "%pscan <url | message link>",
  aliases: ["checkurl", "urlscan"],
  premium: true,
  callback: async (client, message, args) => {
    let url = args[0];

    if (!url) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ No URL Provided")
            .setDescription(
              "Please provide a URL to scan.\nUsage: `%pscan <url>`",
            )
            .setColor(0xd21872),
        ],
      });
    }

    if (!/^https?:\/\//.test(url)) {
      url = "http://" + url;
    }

    if (/^https?:\/\/(www\.)?discord\.com\/channels\/\d+\/\d+\/\d+/.test(url)) {
      const [_, guildId, channelId, messageId] = url.match(
        /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/,
      );

      try {
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
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ No URLs Found")
                .setDescription(
                  "The linked message does not contain any URLs to scan.",
                )
                .setColor(0xd21872),
            ],
          });
        }

        url = urls[0];
      } catch (err) {
        console.error("Failed to fetch linked message:", err);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Invalid Message Link")
              .setDescription(
                "Please provide a valid Discord message link containing a URL (and make sure the bot has access to that message).",
              )
              .setColor(0xd21872),
          ],
        });
      }
    }

    try {
      new URL(url);
    } catch {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Invalid URL")
            .setDescription(
              "Please provide a valid URL including `http://` or `https://`",
            )
            .setColor(0xd21872),
        ],
      });
    }

    const loading = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔍 Scanning URL...")
          .setDescription(
            "Running deep analysis, this may take a few seconds...",
          )
          .setColor(0x5865f2),
      ],
    });

    try {
      const [gsbResult, urlscanResult, ipqsResult] = await Promise.allSettled([
        runGSB(url),
        runURLScan(url),
        runIPQualityScore(url),
      ]);

      const gsb = gsbResult.status === "fulfilled" ? gsbResult.value : null;
      const urlscan =
        urlscanResult.status === "fulfilled" ? urlscanResult.value : null;
      const ipqs = ipqsResult.status === "fulfilled" ? ipqsResult.value : null;

      const isIPQSMalicious =
        ipqs?.malicious || ipqs?.unsafe || ipqs?.fraud_score >= 85;
      const isIPQSSuspicious =
        !isIPQSMalicious && (ipqs?.suspicious || (ipqs?.risk_score ?? 0) >= 70);
      const isMalicious = gsb?.malicious || isIPQSMalicious;
      const isSuspicious =
        !isMalicious && ((urlscan?.score ?? 0) >= 70 || isIPQSSuspicious);
      const isClean = !isMalicious && !isSuspicious;

      let color, badge, verdictLine;
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

      // parse domain
      const domain = new URL(url).hostname;

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${badge}`)
        .setDescription(`> ${verdictLine}`)
        .addFields({
          name: "URL",
          value: `\`\`\`${url}\`\`\``,
          inline: false,
        });

      if (gsb?.malicious && gsb.threats.length > 0) {
        embed.addFields({
          name: "Threats Detected",
          value: gsb.threats.map((t) => `• ${t}`).join("\n"),
          inline: false,
        });
      }

      const infoLines = [];
      if (domain) infoLines.push(`**Domain:** \`${domain}\``);
      if (urlscan?.ip) infoLines.push(`**IP Address:** \`${urlscan.ip}\``);
      if (urlscan?.country)
        infoLines.push(`**Server Location:** \`${urlscan.country}\``);
      if (urlscan?.asn) infoLines.push(`**ASN:** \`${urlscan.asn}\``);
      if (urlscan?.server) infoLines.push(`**Server:** \`${urlscan.server}\``);

      if (infoLines.length > 0) {
        embed.addFields({
          name: "Site Information",
          value: infoLines.join("\n"),
          inline: false,
        });
      }

      // if (ipqs) {
      //   const ipqsLines = [
      //     `**Malicious:** ${ipqs.malicious ? "Yes" : "No"}`,
      //     `**Suspicious:** ${ipqs.suspicious ? "Yes" : "No"}`,
      //     `**Risk Score:** ${ipqs.risk_score ?? "N/A"}`,
      //   ];

      //   if (typeof ipqs.unsafe === "boolean") {
      //     ipqsLines.push(`**Unsafe:** ${ipqs.unsafe ? "Yes" : "No"}`);
      //   }
      //   if (ipqs.host) {
      //     ipqsLines.push(`**Host:** ${ipqs.host}`);
      //   }
      //   if (ipqs.country_code) {
      //     ipqsLines.push(`**Country:** ${ipqs.country_code}`);
      //   }

      //   embed.addFields({
      //     name: "IPQualityScore",
      //     value: ipqsLines.join("\n"),
      //     inline: false,
      //   });
      // }

      if (urlscan?.score) {
        const score = urlscan.score;
        const filled = Math.round(score / 10);
        const empty = 10 - filled;
        const bar = "█".repeat(filled) + "░".repeat(empty);
        const scoreColor = score >= 70 ? "🔴" : score >= 40 ? "🟡" : "🟢";
        embed.addFields({
          name: "Risk Score",
          value: `${scoreColor} \`${bar}\` **${score}/100**`,
          inline: false,
        });
      }

      // scan coverage
      const sources = [];
      if (gsb) sources.push("Google Safe Browsing");
      if (urlscan) sources.push("URLScan.io");
      if (ipqs) sources.push("IPQualityScore");
      embed.addFields({
        name: "Scanned Against",
        value: sources.map((s) => `• ${s}`).join("\n"),
        inline: true,
      });

      embed.setTimestamp().setFooter({
        text: `Requested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      });

      const components = [];
      if (urlscan?.resultUrl) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Full Report")
            .setStyle(5)
            .setURL(urlscan.resultUrl),
        );
        components.push(row);
      }

      return loading.edit({ embeds: [embed], components });
    } catch (err) {
      console.error(err);
      return loading.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Scan Failed")
            .setDescription(
              "Something went wrong while scanning. Try again later.",
            )
            .setColor(0xd21872),
        ],
      });
    }
  },
};

async function runGSB(url) {
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
  const matches = data.matches ?? [];

  return {
    malicious: matches.length > 0,
    threats: matches.map((m) => m.threatType.replace(/_/g, " ")),
  };
}

async function runURLScan(url) {
  const submitHeaders = { "Content-Type": "application/json" };
  if (URLSCAN_API_KEY) submitHeaders["API-Key"] = URLSCAN_API_KEY;

  const submit = await fetch("https://urlscan.io/api/v1/scan/", {
    method: "POST",
    headers: submitHeaders,
    body: JSON.stringify({ url, visibility: "public" }),
  });

  const submitData = await submit.json();

  if (!submitData.uuid) return null;

  await new Promise((res) => setTimeout(res, 10000));

  const pollHeaders = { ...submitHeaders };

  for (let i = 0; i < 8; i++) {
    await new Promise((res) => setTimeout(res, 5000));

    const result = await fetch(
      `https://urlscan.io/api/v1/result/${submitData.uuid}/`,
      { headers: pollHeaders },
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

async function runIPQualityScore(url) {
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
