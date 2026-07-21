import { MessageFlags } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { analyzeComplexity } from "../../utils/code/analyzeComplexity.ts";
import {
  parseCodeBlock,
  parseCodeCommandInput,
} from "../../utils/code/codeInput.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

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
            flags: MessageFlags.IsComponentsV2,
            components: buildErrorComponent({
              title: "❌ No Code Found to Analyze!",
            }),
          });
        }

        code = fetchedCodeBlock.code?.trim() ?? "";
      } catch (err) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Failed to Fetch Message!",
            description: String(err),
          }),
        });
      }
    }

    if (!code) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ No Code Found to Analyze!",
        }),
      });
    }

    try {
      if (!code.trim()) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Provide Code in a Code Block.",
            description: "Example:\n```js\nfor(let i=0;i<n;i++){}\n```",
          }),
        });
      }

      const result = analyzeComplexity(code);

      const indicators =
        result.indicators
          .slice(0, 5)
          .map((x) => `• ${x}`)
          .join("\n") || "• None";

      const reasoning =
        result.reasoning.join(" ") || "No additional reasoning.";

      const components = buildComponents([
        {
          type: "container",
          accentColor: 0x5865f2,
          components: [
            {
              type: "text",
              content: "### Big-O Complexity Estimation",
            },
            { type: "separator" },
            {
              type: "text",
              content: [
                `**Estimated Complexity**: \`${result.complexity}\``,
                `**Confidence**: ${result.confidence}`,
              ].join("\n"),
            },
            { type: "separator", spacing: "small", divider: false },
            {
              type: "text",
              content: `**Key Indicators**\n${indicators}`,
            },
            {
              type: "text",
              content: `**Reasoning**\n${reasoning}`,
            },
            { type: "separator" },
            {
              type: "text",
              content: "-# Quill Big-O Analyzer • heuristic estimation",
            },
          ],
        },
      ]);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components,
      });
    } catch (err) {
      console.error(err);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Analysis Failed",
          description: String(err),
        }),
      });
    }
  },
};
