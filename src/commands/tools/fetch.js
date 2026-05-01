import { EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import getConfig from "../../utils/getConfig.js";

export default {
  name: "fetch",
  description: "Make an HTTP request and display the response",
  aliases: ["postman", "http"],
  premium: true,
  callback: async (client, message, args) => {
    try {
      /*

      usage:

      ;fetch <url> <method, default=get>
      ```[json]
    <body>
    ```


      */

      const { emojis } = await getConfig();
      const { check, x, tick } = emojis;

      const url = args[0];
      const body = message.content.split("```").slice(1, -1).join("```");
      const method = args[1]?.toUpperCase() || "GET";
      const reaction = await message.react(tick).catch(() => {});

      if (!url || !/^https?:\/\//.test(url)) {
        message.reply(
          "Please provide a valid URL starting with http:// or https://",
        );
        await reaction.remove().catch(() => {});
        await message.react(x);
        return;
      }

      if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(method)) {
        message.reply(
          "Please provide a valid HTTP method (GET, POST, PUT, DELETE, PATCH)",
        );
        await reaction.remove().catch(() => {});
        await message.react(x);
        return;
      }

      let requestBody;
      if (body) {
        try {
          requestBody = JSON.stringify(JSON.parse(body));
        } catch (parseError) {
          message.reply(
            "Please provide a valid JSON body inside code fences when sending a request body.",
          );
          await reaction.remove().catch(() => {});
          await message.react(x);
          return;
        }
      }

      const res = await fetch(url, {
        method,
        ...(requestBody
          ? { headers: { "Content-Type": "application/json" } }
          : {}),
        body: requestBody,
      });

      const text = await res.text();

      const embed = new EmbedBuilder()
        .setTitle(
          `${
            res.status >= 200 && res.status < 300
              ? "✅"
              : res.status >= 300 && res.status < 400
                ? "↪️"
                : res.status >= 400 && res.status < 500
                  ? "⚠️"
                  : "❌"
          } ${res.status} ${res.statusText || "Unknown"}`,
        )

        .setDescription("```\n" + text.slice(0, 1900) + "```\n")
        .setFooter({ text: `${method} ${url.slice(0, 100)}` })
        .setColor(
          res.status >= 200 && res.status < 300
            ? 0x22c55e
            : res.status >= 300 && res.status < 400
              ? 0x3b82f6
              : res.status >= 400 && res.status < 500
                ? 0xf59e0b
                : 0xef4444,
        );

      await reaction.remove().catch(() => {});
      await message.react(check);
      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("Error occurred while fetching the URL.");
    }
  },
};
