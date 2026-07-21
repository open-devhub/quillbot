import { MessageFlags } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

export default {
  name: "base64",
  description: "Encode or decode Base64 strings.",
  usage: "base64 <encode|decode> <text>",
  aliases: ["b64"],
  callback: {
    encode: async ({ message, args }: CommandCallbackOpts) => {
      const text = args.join(" ");

      if (!text) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Missing Input",
            description: "Please provide some text to encode.",
          }),
        });
      }

      const encoded = Buffer.from(text, "utf8").toString("base64");

      const original = text.length > 1024 ? text.slice(0, 1021) + "..." : text;
      const encodedDisplay =
        encoded.length > 1024
          ? "```" + encoded.slice(0, 1021) + "...```"
          : "```" + encoded + "```";

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x2ecc71,
            components: [
              { type: "text", content: "### 🔐 Base64 Encode" },
              {
                type: "text",
                content: `**Original Text**\n${original}`,
              },
              {
                type: "text",
                content: `**Encoded (Base64)**\n${encodedDisplay}`,
              },
            ],
          },
        ]),
      });
    },

    decode: async ({ message, args }: CommandCallbackOpts) => {
      const input = args.join(" ");

      if (!input) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Missing Input",
            description: "Please provide a Base64 string to decode.",
          }),
        });
      }

      try {
        const decoded = Buffer.from(input, "base64").toString("utf8");

        if (!decoded || decoded.includes("\u0000")) {
          throw new Error("Invalid Base64");
        }

        const inputDisplay =
          input.length > 1024
            ? "```" + input.slice(0, 1021) + "...```"
            : "```" + input + "```";
        const decodedDisplay =
          decoded.length > 1024 ? decoded.slice(0, 1021) + "..." : decoded;

        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildComponents([
            {
              type: "container",
              accentColor: 0x3498db,
              components: [
                { type: "text", content: "### 🔓 Base64 Decode" },
                {
                  type: "text",
                  content: `**Base64 Input**\n${inputDisplay}`,
                },
                {
                  type: "text",
                  content: `**Decoded Text**\n${decodedDisplay}`,
                },
              ],
            },
          ]),
        });
      } catch {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Invalid Base64",
            description: "That doesn't look like valid Base64.",
          }),
        });
      }
    },
  },
};
