import { EmbedBuilder } from "discord.js";
import { getServerStats, getStats } from "../../utils/stats.js";

export default {
  name: "stats",
  description: "See bot statistics",
  aliases: ["statistics"],
  devOnly: true,
  premium: true,
  async callback(client, message, args) {
    try {
      const stats = await getStats();
      const serverStats = await getServerStats(message.guildId);

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
      const sortedCommands = Object.entries(commandsData)
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

      // Server stats embed
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
