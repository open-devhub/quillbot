import { MessageFlags } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";
import { getServerStats, getStats } from "../../utils/misc/stats.ts";

export default {
  name: "stats",
  description: "See bot statistics",
  aliases: ["statistics"],
  devOnly: true,
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      if (args[0]) {
        const serverStats = await getServerStats(args[0]);
        if (!serverStats) {
          return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: buildErrorComponent({
              title: "❌ No Server Stats",
              description: `No statistics found for the server ID: \`${args[0]}\`. Make sure the bot has been used there.`,
            }),
          });
        }

        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildComponents([
            {
              type: "container",
              accentColor: 0xff9900,
              components: [
                {
                  type: "text",
                  content: `### 📍 Server Statistics: ${serverStats.name || "Unknown Server"}`,
                },
                { type: "separator", spacing: "small" },
                {
                  type: "text",
                  content: [
                    `**Total Commands Run**: ${serverStats.totalCommandsRan || 0}`,
                    `**Daily**: ${serverStats.daily?.commandsRan || 0}`,
                    `**Weekly**: ${serverStats.weekly?.commandsRan || 0}`,
                    `**Monthly**: ${serverStats.monthly?.commandsRan || 0}`,
                  ].join("\n"),
                },
              ],
            },
          ]),
        });
      }

      const stats = await getStats();
      const serverStats = message.guildId
        ? await getServerStats(message.guildId)
        : null;

      const globalData = stats.global || {};
      const commandsData = stats.commands || {};

      const sortedCommands = Object.entries(
        commandsData as Record<string, number>,
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const components = [
        {
          type: "container" as const,
          accentColor: 0x0099ff,
          components: [
            {
              type: "text" as const,
              content: "### 📊 Global Statistics",
            },
            {
              type: "separator" as const,
              spacing: "small" as const,
            },
            {
              type: "text" as const,
              content: [
                `**Total Commands Run**: ${globalData.totalCommandsRan || 0}`,
                `**Daily**: ${globalData.daily?.commandsRan || 0}`,
                `**Weekly**: ${globalData.weekly?.commandsRan || 0}`,
                `**Monthly**: ${globalData.monthly?.commandsRan || 0}`,
              ].join("\n"),
            },
          ],
        },
        {
          type: "container" as const,
          accentColor: 0x00ff99,
          components: [
            {
              type: "text" as const,
              content: "### 🏆 Top Commands",
            },
            {
              type: "separator" as const,
              spacing: "small" as const,
            },
            {
              type: "text" as const,
              content:
                sortedCommands.length > 0
                  ? sortedCommands
                      .map(
                        ([command, uses], index) =>
                          `${index + 1}. \`${command}\`: **${uses}**`,
                      )
                      .join("\n")
                  : "No command data yet.",
            },
          ],
        },
      ];

      if (serverStats) {
        components.push({
          type: "container",
          accentColor: 0xff9900,
          components: [
            {
              type: "text",
              content: `### 📍 Server Statistics\n${serverStats.name || message.guild?.name || "Unknown Server"}`,
            },
            {
              type: "separator",
              spacing: "small",
            },
            {
              type: "text",
              content: [
                `**Total Commands Run**: ${serverStats.totalCommandsRan || 0}`,
                `**Daily**: ${serverStats.daily?.commandsRan || 0}`,
                `**Weekly**: ${serverStats.weekly?.commandsRan || 0}`,
                `**Monthly**: ${serverStats.monthly?.commandsRan || 0}`,
              ].join("\n"),
            },
          ],
        });
      }

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents(components),
      });
    } catch (error) {
      console.error("Error fetching stats:", error);

      await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Error",
          description: "Failed to fetch statistics.",
        }),
      });
    }
  },
};
