import { MessageFlags } from "discord.js";
import ucid from "unique-custom-id";
import config from "../../../config.json" with { type: "json" };
import { createEntry } from "../../firestore/support.ts";
import type { CommandCallbackOpts } from "../../types/command.ts";
import type { Log } from "../../types/log.ts";
import type { SupportDoc } from "../../types/support.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";
import { log } from "../../utils/discord/log.ts";

export default {
  name: "feature",
  description: "Suggest a feature to be added",
  usage: "feature <description> [image attachment]",
  aliases: ["feat", "newfeature", "newfeat"],
  async callback({ client, message, args }: CommandCallbackOpts) {
    try {
      const { emojis, support, premiumServer } = config;
      const { check } = emojis;
      const { reports } = support;

      const reportId = ucid.format("short");

      const content = args.join(" ");
      if (!content) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ No Description Provided",
            description:
              "Please provide a description of the feature you want to suggest.",
          }),
        });
      }

      const guild = await client.guilds.fetch(premiumServer);
      const reportsChannel = await guild.channels.fetch(reports);

      if (!guild || !reportsChannel) {
        console.error("Feature request system not configured properly.");
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Feature Request System Unavailable",
            description:
              "The feature request system is not set up correctly. Please contact the bot developers.",
          }),
        });
      }

      const attachment = message.attachments.first();
      const imageUrl = attachment?.url || null;

      log({
        title: "💻 New Feature Request",
        description: `\`\`\`${content.slice(0, 2000)}\`\`\``,
        fields: [
          { name: "Request ID", value: `\`${reportId}\`` },
          {
            name: "User",
            value: `${message.author.tag} (${message.author.id})`,
          },
          {
            name: "Server",
            value: `${message.guild?.name} (${message.guild?.id})`,
          },
        ],
        thumbnail: message.author.displayAvatarURL({ size: 256 }),
        color: 0xffcc00,
        image: imageUrl || undefined,
        timestamp: true,
      } as Log);

      await message.react(check);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0xffcc00,
            components: [
              { type: "text", content: "### 💻 Feature Request Sent" },
              {
                type: "text",
                content:
                  "Your feature request has been submitted to bot developers successfully.",
              },
              { type: "separator", spacing: "small", divider: false },
              {
                type: "text",
                content: [
                  `**ID**: \`${reportId}\``,
                  `**Date**: ${new Date().toLocaleString()}`,
                ].join("\n"),
              },
            ],
          },
        ]),
      });

      createEntry({
        type: "feature",
        id: String(reportId),
        description: content,
        user: {
          id: message.author.id,
          tag: message.author.tag,
        },
        server:
          message.guild?.id && message.guild?.name
            ? {
                id: message.guild?.id,
                name: message.guild?.name,
              }
            : undefined,
        date: new Date().toISOString(),
      } as SupportDoc);
    } catch (err) {
      console.error(err);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Error Submitting Feature Request",
          description:
            "An error occurred while submitting your feature request.",
        }),
      });
    }
  },
};
