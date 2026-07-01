import { EmbedBuilder } from "discord.js";
import ucid from "unique-custom-id";
import config from "../../../config.json" with { type: "json" };
import { createEntry } from "../../firestore/support.ts";
import type { CommandCallbackOpts } from "../../types/command.ts";
import type { Log } from "../../types/log.ts";
import type { SupportDoc } from "../../types/support.ts";
import { log } from "../../utils/log.ts";

export default {
  name: "report",
  description: "Report a bug or issue with the bot",
  usage: "%preport <description> [image attachment]",
  aliases: ["bug", "issue"],
  async callback({ client, message, args }: CommandCallbackOpts) {
    try {
      const { emojis, support, premiumServer } = config;
      const { check, x } = emojis;
      const { reports } = support;

      const reportId = ucid.format("short");

      const content = args.join(" ");
      if (!content) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ No description provided")
              .setDescription(
                "Please provide a description of the issue you're experiencing.",
              )
              .setColor(0xd21872),
          ],
        });
      }

      const guild = await client.guilds.fetch(premiumServer);
      const reportsChannel = await guild.channels.fetch(reports);

      if (!guild || !reportsChannel) {
        console.error("Reporting system not configured properly.");
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Reporting system unavailable")
              .setDescription(
                "The reporting system is not set up correctly. Please contact the bot developers.",
              )
              .setColor(0xd21872),
          ],
        });
      }

      const attachment = message.attachments.first();
      const imageUrl = attachment?.url || null;

      log({
        title: "🐛 New Bug Report",
        description: `\`\`\`${content.slice(0, 2000)}\`\`\``,
        fields: [
          {
            name: "Report ID",
            value: `\`${reportId}\``,
          },
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
        embeds: [
          new EmbedBuilder()
            .setTitle("🐛 Bug Reported")
            .setDescription("Your report has been submitted successfully.")
            .setFields(
              {
                name: "ID",
                value: String(reportId),
                inline: true,
              },
              {
                name: "Date",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ),
        ],
      });

      createEntry({
        type: "report",
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
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Error reporting issue")
            .setDescription("An error occurred while submitting your report.")
            .setColor(0xd21872),
        ],
      });
    }
  },
};
