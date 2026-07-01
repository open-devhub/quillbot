import { EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import type { CommandCallbackOpts } from "../../types/command.ts";

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
      if (!url || !/^https?:\/\//.test(url)) {
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
