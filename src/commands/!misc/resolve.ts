import { MessageFlags } from "discord.js";
import { getEntry, removeEntry } from "../../firestore/support.ts";
import type { CommandCallbackOpts } from "../../types/command.ts";
import type { Log } from "../../types/log.ts";
import type { SupportDoc } from "../../types/support.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";
import { log } from "../../utils/discord/log.ts";

export default {
  name: "resolve",
  description: "Resolve a support report",
  devOnly: true,

  async callback({ message, args }: CommandCallbackOpts) {
    try {
      if (!args[0]) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Missing Report ID",
            description: "Please provide a report ID to resolve.",
          }),
        });
      }

      const reportId = args[0];
      const report = (await getEntry(reportId)) as SupportDoc | null;

      if (!report) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Report Not Found",
            description: "No report found with that ID.",
          }),
        });
      }

      await removeEntry(reportId);

      const type = report.type;
      const isBug = type === "report";
      const title = isBug ? "✅ Bug Fixed" : "✅ Suggestion Applied";
      const label = isBug ? "Report" : "Request";

      const userComponents = buildComponents([
        {
          type: "container",
          accentColor: 0x2ecc71,
          components: [
            { type: "text", content: `### ${title}` },
            {
              type: "text",
              content: `Your ${isBug ? "bug report" : "feature request"} has been resolved:\n\`\`\`${report.description.slice(0, 2000)}\`\`\`\nThank you for your contribution!`,
            },
            { type: "separator", spacing: "small", divider: false },
            {
              type: "text",
              content: [
                `**${label} ID**: \`${reportId}\``,
                `**Resolved by**: ${message.author.tag}`,
              ].join("\n"),
            },
          ],
        },
      ]);

      // DM the user who submitted the report
      try {
        const user = await message.client.users.fetch(report.user.id);
        if (user) {
          await user.send({
            flags: MessageFlags.IsComponentsV2,
            components: userComponents,
          });
        }
      } catch {
        // User may have DMs closed
      }

      log({
        title: isBug ? "🐛 Bug Report Resolved" : "💻 Feature Request Resolved",
        description: `\`\`\`${report.description.slice(0, 2000)}\`\`\``,
        fields: [
          { name: `${label} ID`, value: `\`${reportId}\`` },
          {
            name: "Resolved by",
            value: `${message.author.tag} (${message.author.id})`,
          },
        ],
        color: 0x2ecc71,
        timestamp: true,
      } as Log);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x2ecc71,
            components: [
              {
                type: "text",
                content: `### ${isBug ? "🐛 Bug Report Resolved" : "💻 Feature Request Resolved"}`,
              },
              {
                type: "text",
                content: "The support report has been resolved successfully.",
              },
              { type: "separator", spacing: "small", divider: false },
              {
                type: "text",
                content: [
                  `**${label} ID**: \`${reportId}\``,
                  `**Resolved by**: ${message.author.tag}`,
                ].join("\n"),
              },
            ],
          },
        ]),
      });
    } catch (err) {
      console.error("Error resolving support report:", err);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Error Resolving Report",
          description: "An error occurred while resolving the support report.",
        }),
      });
    }
  },
};
