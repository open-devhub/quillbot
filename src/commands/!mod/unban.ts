import { Client, EmbedBuilder, Message } from "discord.js";
import { deleteDocument } from "../../utils/firestore.js";
import getConfig from "../../utils/getConfig.js";

export default {
  name: "unban",
  description: "Unban a server to give access to the bot",
  devOnly: true,

  async callback(client: Client, message: Message, args: string[]) {
    try {
      const { premiumServer, logs } = await getConfig();

      const pguild = await client.guilds.fetch(premiumServer).catch(() => null);

      const logChannel = pguild
        ? await pguild.channels.fetch(logs).catch(() => null)
        : null;

      const guildId = args[0] || message.guild?.id;

      if (!guildId) {
        return message.reply("Provide a guild ID.");
      }

      const guild = client.guilds.cache.get(guildId);

      await deleteDocument("bannedGuilds", guildId);

      await message.delete().catch(() => {});

      if (guild) {
        await guild.leave().catch((err) => {
          console.error("Failed to leave guild:", err);
        });
      }

      if (logChannel && "send" in logChannel) {
        const reportEmbed = new EmbedBuilder()
          .setTitle("✅ Server Unbanned")
          .addFields(
            {
              name: "Server",
              value: `${guildId}`,
            },
            {
              name: "Mod",
              value: `${message.author.tag} (${message.author.id})`,
            },
          )
          .setColor(0x2ecc71)
          .setTimestamp();

        await logChannel.send({ embeds: [reportEmbed] });
      }
    } catch (err) {
      console.error(err);
      return message.reply("Something went wrong while unbanning the guild.");
    }
  },
};
