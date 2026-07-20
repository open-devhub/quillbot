import { EmbedBuilder } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { analyzeComplexity } from "../../utils/code/analyzeComplexity.ts";
import {
  parseCodeBlock,
  parseCodeCommandInput,
} from "../../utils/code/codeInput.ts";

export default {
  name: "complexity",
  description: "Estimate Big-O complexity of code",
  usage: "complexity\n<codeblock | message link>",
  aliases: ["bigo", "big-o", "algo"],

  async callback({ client, message, args }: CommandCallbackOpts) {
    const { codeBlock: parsedBlock, link } = parseCodeCommandInput(
      message.content,
      args,
    );

    let code: string | undefined;

    if (parsedBlock) {
      code = parsedBlock.code;
    } else if (link) {
      const [, guildId, channelId, messageId] =
        link.match(/https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/) ??
        [];

      try {
        if (!guildId || !channelId || !messageId) {
          throw new Error("Invalid Discord link provided.");
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) throw new Error("Guild not found");

        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased())
          throw new Error("Channel not found or not text-based");

        const fetchedMessage = await channel.messages.fetch(messageId);

        const fetchedCodeBlock = parseCodeBlock(fetchedMessage.content);

        if (!fetchedCodeBlock) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ No code found to analyze!")
                .setColor(0xd21872),
            ],
          });
        }

        code = fetchedCodeBlock.code?.trim() ?? "";
      } catch (err) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Failed to fetch message")
              .setDescription(String(err))
              .setColor(0xd21872),
          ],
        });
      }
    }

    if (!code) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ No code found to analyze!")
            .setColor(0xd21872),
        ],
      });
    }

    const safe = (input: string, limit = 1000) => {
      return input.length > limit
        ? input.slice(0, limit) + "\n... (truncated)"
        : input;
    };

    const codePreview = (input: string, limit = 180) => {
      const trimmed = input.trim();
      const lines = trimmed.split(/\r?\n/).slice(0, 3);
      const preview = lines.join(" ").replace(/\s+/g, " ").trim();
      return preview.length > limit ? preview.slice(0, limit) + "..." : preview;
    };

    try {
      if (!code.trim()) {
        return message.reply(
          "Provide code in a codeblock.\nExample:\n```js\nfor(let i=0;i<n;i++){}\n```",
        );
      }

      const result = analyzeComplexity(code);

      const embed = new EmbedBuilder()
        .setTitle("Big-O Complexity Estimation")
        .setColor(0x5865f2)
        .addFields(
          {
            name: "Estimated Complexity",
            value: `\`${result.complexity}\``,
            inline: true,
          },
          {
            name: "Confidence",
            value: result.confidence,
            inline: true,
          },
          {
            name: "Key Indicators",
            value:
              result.indicators
                .slice(0, 5)
                .map((x) => `• ${x}`)
                .join("\n") || "• None",
          },
          {
            name: "Reasoning",
            value: result.reasoning.join(" ") || "No additional reasoning.",
          },
          {
            name: "Code Preview",
            value: `\`\`\`js\n${safe(codePreview(code), 200)}\n\`\`\``,
          },
        )
        .setFooter({
          text: "Quill Big-O Analyzer • heuristic estimation",
        });

      return message.reply({
        embeds: [embed],
      });
    } catch (err) {
      console.error(err);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Analysis failed")
            .setDescription(String(err))
            .setColor(0xd21872),
        ],
      });
    }
  },
};
