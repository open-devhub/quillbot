import { MessageFlags } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

export default {
  name: "snowflake",
  description:
    "Decodes a Discord Snowflake ID to extract its creation metadata.",
  usage: "snowflake <snowflake>",
  aliases: ["sf"],

  async callback({ message, args }: CommandCallbackOpts) {
    const idStr = args[0];

    if (!idStr) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Snowflake Missing",
          description:
            "Please provide a valid Discord ID to decode. Example: `p!snowflake 123456789012345678`",
        }),
      });
    }

    if (!/^\d+$/.test(idStr)) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Invalid Snowflake",
          description:
            "That doesn't look like a valid Discord ID. It must contain numbers only.",
        }),
      });
    }

    try {
      const id = BigInt(idStr);

      const DISCORD_EPOCH = 1420070400000n;

      const timestampMs = Number((id >> 22n) + DISCORD_EPOCH);
      const workerId = Number((id >> 17n) & 0x1fn);
      const processId = Number((id >> 12n) & 0x1fn);
      const increment = Number(id & 0xfffn);

      const date = new Date(timestampMs);
      const unixTimestamp = Math.floor(timestampMs / 1000);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x5865f2,
            components: [
              {
                type: "text",
                content: "### ❄️ Snowflake Decoder Result",
              },
              {
                type: "text",
                content: `Decoded metadata for raw ID: \`${idStr}\``,
              },
              {
                type: "separator",
                spacing: "small",
              },
              {
                type: "text",
                content: [
                  `**Creation Date**: ${date.toUTCString()}`,
                  `**Relative Time**: <t:${unixTimestamp}:R>`,
                  `**Unix Milliseconds**: \`${timestampMs}\``,
                  `**Worker ID**: \`${workerId}\``,
                  `**Process ID**: \`${processId}\``,
                  `**Increment Index**: \`${increment}\``,
                ].join("\n"),
              },
              {
                type: "separator",
                spacing: "small",
              },
              {
                type: "text",
                content: `-# Requested by ${message.author.tag}`,
              },
            ],
          },
        ]),
      });
    } catch (error) {
      console.error("Snowflake processing error:", error);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Error",
          description:
            "An error occurred while decoding that ID. Make sure it's a valid 64-bit integer.",
        }),
      });
    }
  },
};
