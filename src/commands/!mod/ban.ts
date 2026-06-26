import { EmbedBuilder } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { createDocument } from "../../utils/firestore.ts";
import getConfig from "../../utils/getConfig.ts";

export default {
  name: "ban",
  description: "Ban a server from using the bot",
  devOnly: true,

  async callback({ client, message, args }: CommandCallbackOpts) {
    try {
      const { premiumServer, logs } = await getConfig();

      const pguild = await client.guilds.fetch(premiumServer).catch(() => null);

      const logChannel = pguild
        ? await pguild.channels.fetch(logs).catch(() => null)
        : null;

      if (!logChannel?.isSendable?.()) {
        return;
      }

      const guildId = args[0] || message.guild?.id;

      if (guildId == premiumServer) return;

      if (!guildId) {
        return message.reply("Provide a guild ID.");
      }

      const guild = client.guilds.cache.get(guildId);

      await createDocument("bannedGuilds", guildId, {
        reason: args.slice(1).join(" ") || "No reason provided",
        mod: message.author.id,
        date: Date.now(),
      });

      await message.delete().catch(() => {});

      if (guild) {
        await guild.leave().catch((err) => {
          console.error("Failed to leave guild:", err);
        });
      }

      const reportEmbed = new EmbedBuilder()
        .setTitle("🚫 Server Banned")
        .addFields(
          {
            name: "Server",
            value: `${guild?.name || "Unknown"} (${guildId})`,
          },
          {
            name: "Mod",
            value: `${message.author.tag} (${message.author.id})`,
          },
          {
            name: "Reason",
            value: args.slice(1).join(" ") || "No reason provided",
          },
        )
        .setThumbnail(
          guild?.iconURL?.({ extension: "png", size: 1024 }) || null,
        )
        .setColor(0xffcc00)
        .setTimestamp();

      await logChannel.send({ embeds: [reportEmbed] });
    } catch (err) {
      console.error(err);
      return message.reply("Something went wrong while banning the guild.");
    }
  },
};
