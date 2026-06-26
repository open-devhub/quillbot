import { EmbedBuilder } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { getServerStats, getStats } from "../../utils/stats.ts";

export default {
  name: "stats",
  description: "See bot statistics",
  aliases: ["statistics"],
  devOnly: true,
  async callback({ client, message, args }: CommandCallbackOpts) {
    try {
      if (args[0]) {
        const serverStats = await getServerStats(args[0]);
        if (!serverStats) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ No Server Stats")
                .setDescription(
                  `No statistics found for the server ID: \`${args[0]}\`. Make sure the bot has been used there.`,
                )
                .setColor(0xd21872),
            ],
          });
        }

        const serverEmbed = new EmbedBuilder()
          .setTitle(
            `📍 Server Statistics - ${serverStats.name || "Unknown Server"}`,
          )
          .setColor(0xff9900)
          .addFields(
            {
              name: "Total Commands Run",
              value: `${serverStats.totalCommandsRan || 0}`,
              inline: true,
            },
            {
              name: "Daily",
              value: `${serverStats.daily?.commandsRan || 0}`,
              inline: true,
            },
            {
              name: "Weekly",
              value: `${serverStats.weekly?.commandsRan || 0}`,
              inline: true,
            },
            {
              name: "Monthly",
              value: `${serverStats.monthly?.commandsRan || 0}`,
              inline: true,
            },
          );
        return message.reply({ embeds: [serverEmbed] });
      }

      const stats = await getStats();
      const serverStats = message.guildId
        ? await getServerStats(message.guildId)
        : null;

      const globalData = stats.global || {};
      const commandsData = stats.commands || {};

      // Global stats embed
      const globalEmbed = new EmbedBuilder()
        .setTitle("📊 Bot Statistics - Global")
        .setColor(0x0099ff)
        .addFields(
          {
            name: "Total Commands Run",
            value: `${globalData.totalCommandsRan || 0}`,
            inline: true,
          },
          {
            name: "Daily",
            value: `${globalData.daily?.commandsRan || 0}`,
            inline: true,
          },
          {
            name: "Weekly",
            value: `${globalData.weekly?.commandsRan || 0}`,
            inline: true,
          },
          {
            name: "Monthly",
            value: `${globalData.monthly?.commandsRan || 0}`,
            inline: true,
          },
        );

      // Most used commands embed
      const sortedCommands = Object.entries(
        commandsData as Record<string, number>,
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      let commandsText = "";
      if (sortedCommands.length > 0) {
        commandsText = sortedCommands
          .map((entry, index) => `${index + 1}. \`${entry[0]}\` - ${entry[1]}`)
          .join("\n");
      } else {
        commandsText = "No command data yet.";
      }

      const commandsEmbed = new EmbedBuilder()
        .setTitle("🏆 Top Commands")
        .setDescription(commandsText)
        .setColor(0x00ff99);

      let serverEmbed = null;
      if (serverStats) {
        serverEmbed = new EmbedBuilder()
          .setTitle(
            `📍 Server Statistics - ${serverStats.name || message.guild?.name}`,
          )
          .setColor(0xff9900)
          .addFields(
            {
              name: "Total Commands Run",
              value: `${serverStats.totalCommandsRan || 0}`,
              inline: true,
            },
            {
              name: "Daily",
              value: `${serverStats.daily?.commandsRan || 0}`,
              inline: true,
            },
            {
              name: "Weekly",
              value: `${serverStats.weekly?.commandsRan || 0}`,
              inline: true,
            },
          );
      }

      // Send embeds
      const embeds = [globalEmbed, commandsEmbed];
      if (serverEmbed) embeds.push(serverEmbed);

      await message.reply({ embeds });
    } catch (error) {
      console.error("Error fetching stats:", error);
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription("Failed to fetch statistics.")
        .setColor(0xff0000);

      await message.reply({ embeds: [errorEmbed] });
    }
  },
};
