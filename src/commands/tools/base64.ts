import { EmbedBuilder } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "base64",
  description: "Encode or decode Base64 strings.",
  usage: "base64 <encode|decode> <text>",
  aliases: ["b64"],
  callback: {
    encode: async ({ message, args }: CommandCallbackOpts) => {
      const text = args.join(" ");

      if (!text) {
        const embed = new EmbedBuilder()
          .setTitle("❌ Missing Input")
          .setDescription("Please provide some text to encode.")
          .setColor(0xe74c3c);
        return message.reply({ embeds: [embed] });
      }

      const encoded = Buffer.from(text, "utf8").toString("base64");

      const embed = new EmbedBuilder()
        .setTitle("🔐 Base64 Encode")
        .addFields(
          {
            name: "Original Text",
            value: text.length > 1024 ? text.slice(0, 1021) + "..." : text,
          },
          {
            name: "Encoded (Base64)",
            value:
              encoded.length > 1024
                ? "```" + encoded.slice(0, 1021) + "...```"
                : "```" + encoded + "```",
          },
        )
        .setColor(0x2ecc71);

      await message.reply({ embeds: [embed] });
    },

    decode: async ({ message, args }: CommandCallbackOpts) => {
      const input = args.join(" ");

      if (!input) {
        const embed = new EmbedBuilder()
          .setTitle("❌ Missing Input")
          .setDescription("Please provide a Base64 string to decode.")
          .setColor(0xe74c3c);
        return message.reply({ embeds: [embed] });
      }

      try {
        const decoded = Buffer.from(input, "base64").toString("utf8");

        if (!decoded || decoded.includes("\u0000")) {
          throw new Error("Invalid Base64");
        }

        const embed = new EmbedBuilder()
          .setTitle("🔓 Base64 Decode")
          .addFields(
            {
              name: "Base64 Input",
              value:
                input.length > 1024
                  ? "```" + input.slice(0, 1021) + "...```"
                  : "```" + input + "```",
            },
            {
              name: "Decoded Text",
              value:
                decoded.length > 1024
                  ? decoded.slice(0, 1021) + "..."
                  : decoded,
            },
          )
          .setColor(0x3498db);

        await message.reply({ embeds: [embed] });
      } catch {
        const embed = new EmbedBuilder()
          .setTitle("❌ Invalid Base64")
          .setDescription("That doesn't look like valid Base64.")
          .setColor(0xe74c3c);
        await message.reply({ embeds: [embed] });
      }
    },
  },
};
