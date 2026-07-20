import { EmbedBuilder } from "discord.js";
import { getEntry, removeEntry } from "../../firestore/support.ts";
import type { CommandCallbackOpts } from "../../types/command.ts";
import type { Log } from "../../types/log.ts";
import type { SupportDoc } from "../../types/support.ts";
import { log } from "../../utils/discord/log.ts";

export default {
  name: "resolve",
  description: "Resolve a support report",
  devOnly: true,

  async callback({ message, args }: CommandCallbackOpts) {
    try {
      if (!args[0]) {
        return message.reply("Please provide a report ID to resolve.");
      }
      const report = (await getEntry(args[0])) as SupportDoc | null;
      if (!report) {
        return message.reply("No report found with that ID.");
      }
      const reportId = args[0];
      await removeEntry(reportId);

      const type = report.type;

      const reportEmbed = new EmbedBuilder()
        .setTitle(type === "report" ? "✅ Bug Fixed" : "✅ Suggestion Applied")
        .setDescription(
          `Your ${type === "report" ? "bug report" : "feature request"} has been resolved:\n\`\`\`${report.description.slice(0, 2000)}\`\`\`\nThank you for your contribution!`,
        )
        .addFields(
          {
            name: `${type === "report" ? "Report" : "Request"} ID`,
            value: `\`${reportId}\``,
          },
          {
            name: "Resolved by",
            value: `${message.author.tag} (${message.author.id})`,
          },
        )
        .setColor(0x2ecc71)
        .setTimestamp();

      // dm the user who submitted the report
      const user = await message.client.users.fetch(report.user.id);
      if (user) {
        await user.send({
          embeds: [reportEmbed],
        });
      }

      const logContent = {
        title:
          type === "report"
            ? "🐛 Bug Report Resolved"
            : "💻 Feature Request Resolved",
        description: `\`\`\`${report.description.slice(0, 2000)}\`\`\``,
        fields: [
          {
            name: `${type === "report" ? "Report" : "Request"} ID`,
            value: `\`${reportId}\``,
          },
          {
            name: "Resolved by",
            value: `${message.author.tag} (${message.author.id})`,
          },
        ],
        thumbnail: user?.displayAvatarURL({ size: 256 }),
        color: 0x2ecc71,
        timestamp: true,
      };

      log(logContent as Log);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(logContent.title)
            .setDescription(
              "The support report has been resolved successfully.",
            )
            .setFields(logContent.fields)
            .setColor(logContent.color)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error("Error resolving support report:", err);
      return message.reply(
        "An error occurred while resolving the support report.",
      );
    }
  },
};
