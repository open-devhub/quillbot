import { EmbedBuilder } from "discord.js";

export default {
  name: "servers",
  description: "List all servers the bot is in",
  aliases: ["guilds"],
  devOnly: true,
  premium: true,
  callback(client, message, args) {
    try {
      const servers = client.guilds.cache
        .sort((a, b) => b.memberCount - a.memberCount)
        .map((guild) => {
          return `**${guild.name}** (ID: ${guild.id}) - ${guild.memberCount} members`;
        })
        .slice(0, 50)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🤖 Servers List:")
        .setDescription(servers || "The bot is not in any servers.")
        .setColor(0x00ff00);

      message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
    }
  },
};
