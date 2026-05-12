import { EmbedBuilder } from "discord.js";
import fetch from "node-fetch";

export default {
  name: "http",
  description: "Make HTTP requests and inspect responses",
  aliases: ["postman", "fetch", "insomnia"],

  callback: async (client, message, args) => {
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

    const safe = (input, limit = 900) => {
      if (typeof input !== "string") {
        input = JSON.stringify(input, null, 2);
      }
      return input.length > limit
        ? input.slice(0, limit) + "\n... (truncated)"
        : input;
    };

    try {
      if (!url || !/^https?:\/\//.test(url)) {
        return message.reply("Invalid URL (must start with http/https)");
      }

      if (!validMethods.includes(method)) {
        return message.reply(`Invalid method: ${validMethods.join(", ")}`);
      }

      let body;
      if (rawBody?.trim()) {
        try {
          body = JSON.stringify(JSON.parse(rawBody));
        } catch {
          return message.reply("Invalid JSON body.");
        }
      }

      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });

      const duration = Date.now() - start;

      const text = await res.text();

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

      const headers = Object.fromEntries(res.headers.entries());

      const filteredHeaders = {};
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
            value: `${method} ${url}`.slice(0, 1024),
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
            value: res.statusText,
            inline: true,
          },
          {
            name: "Headers",
            value: "```json\n" + safe(filteredHeaders, 500) + "\n```",
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
      return message.reply("Request failed (network or timeout error).");
    }
  },
};
