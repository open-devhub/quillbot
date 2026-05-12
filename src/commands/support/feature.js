import { EmbedBuilder } from "discord.js";
import ucid from "unique-custom-id";
import getConfig from "../../utils/getConfig.js";

export default {
  name: "feature",
  description: "Suggest a feature to be added",
  aliases: ["feat", "newfeature", "newfeat"],
  callback: async (client, message, args) => {
    try {
      const { emojis, support, premiumServer } = await getConfig();
      const { check, x } = emojis;
      const { reports } = support;

      const reportId = ucid.format("mini");

      const content = args.join(" ");
      if (!content) {
        return message.reply(
          "Please describe the feature you want to be added.",
        );
      }

      const guild = await client.guilds.fetch(premiumServer);
      const reportsChannel = await guild.channels.fetch(reports);

      if (!guild || !reportsChannel) {
        console.error("Feature request system not configured properly.");
        return message.reply("Feature request system not configured yet.");
      }

      const attachment = message.attachments.first();
      const imageUrl = attachment?.url || null;

      const reportEmbed = new EmbedBuilder()
        .setTitle("💻 New Feature Request")
        .setDescription(`**${content.slice(0, 2000)}**`)
        .addFields(
          {
            name: "Request ID",
            value: `\`${reportId}\``,
          },
          {
            name: "User",
            value: `${message.author.tag} (${message.author.id})`,
          },
          {
            name: "Server",
            value: `${message.guild?.name} (${message.guild?.id})`,
          },
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setColor(0xffcc00)
        .setTimestamp();

      if (imageUrl) {
        reportEmbed.setImage(imageUrl);
      }

      await reportsChannel.send({
        embeds: [reportEmbed],
      });

      await message.react(check);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("💻 Feature Request Sent")
            .setDescription(
              "Your feature request has been submitted to bot developers successfully.",
            )
            .setFields(
              {
                name: "ID",
                value: reportId,
                inline: true,
              },
              {
                name: "Date",
                value: new Date().toLocaleString(),
                inline: true,
              },
            ),
        ],
      });
    } catch (err) {
      console.error(err);
      return message.reply("Error submitting feature request.");
    }
  },
};
