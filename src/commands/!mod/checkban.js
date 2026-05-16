import { EmbedBuilder } from "discord.js";
import { getDocument } from "../../utils/firestore.js";

export default {
  name: "checkban",
  description: "Check the ban status of a server",
  devOnly: true,

  async callback(client, message, args) {
    try {
      const guildId = args[0] || message.guild?.id;

      if (!guildId) {
        return message.reply("Provide a guild ID.");
      }

      const guild = client.guilds.cache.get(guildId);

      const document = await getDocument("bannedGuilds", guildId);

      if (!document) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("✅ Not Banned")
              .setDescription(
                `The server **${guild?.name || guildId}** is not banned.`,
              )
              .setColor(0x00cc66)
              .setTimestamp(),
          ],
        });
      }

      const { reason, mod, date } = document;
      const modUser = await client.users.fetch(mod).catch(() => null);

      const reportEmbed = new EmbedBuilder()
        .setTitle("🚫 Server Banned")
        .addFields(
          {
            name: "Server ID",
            value: `${guildId}`,
          },
          {
            name: "Mod",
            value: `${modUser?.tag || "Unknown"} (${mod})`,
          },
          {
            name: "Reason",
            value: reason || "No reason provided",
          },
          {
            name: "Date",
            value: new Date(date).toLocaleString(),
          },
        )
        .setColor(0xffcc00)
        .setTimestamp();
      await message.reply({ embeds: [reportEmbed] });
    } catch (err) {
      console.error(err);
      return message.reply(
        "Something went wrong while checking the ban status.",
      );
    }
  },
};
