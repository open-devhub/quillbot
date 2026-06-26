import { EmbedBuilder } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.js";

export default {
  name: "servers",
  description: "List all servers the bot is in",
  aliases: ["guilds"],
  devOnly: true,
  async callback({ client, message, args }: CommandCallbackOpts) {
    try {
      const threshold = 50;
      const serverCount = client.guilds.cache.size;
      const servers =
        client.guilds.cache
          .sort((a, b) => b.memberCount - a.memberCount)
          .map((guild) => {
            return `**${guild.name}** (ID: ${guild.id}) - ${guild.memberCount} members`;
          })
          .slice(0, threshold)
          .join("\n") +
        (serverCount > threshold
          ? `\nAnd ${serverCount - threshold} more...`
          : "");

      const embed = new EmbedBuilder()
        .setTitle(`🤖 In ${serverCount} Servers`)
        .setDescription(servers || "The bot is not in any servers.")
        .setColor(0x00ff00);

      message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
    }
  },
};
