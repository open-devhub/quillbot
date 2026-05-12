import type { APIEmbedField, Client, Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import ucid from "unique-custom-id";
import getConfig from "../../utils/getConfig.js";

export default {
  name: "feature",
  description: "Suggest a feature to be added",
  aliases: ["feat", "newfeature", "newfeat"],
  callback: async (client: Client, message: Message, args: string[]) => {
    try {
      const { emojis, support, premiumServer } = await getConfig();
      const { check, x } = emojis;
      const { reports } = support;

      const reportId = String(ucid.format("mini"));

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

      const reportFields: APIEmbedField[] = [
        {
          name: "Request ID",
          value: reportId,
        },
        {
          name: "User",
          value: `${message.author.tag} (${message.author.id})`,
        },
        {
          name: "Server",
          value: `${message.guild?.name ?? "Unknown"} (${message.guild?.id ?? "Unknown"})`,
        },
      ];

      const reportEmbed = new EmbedBuilder()
        .setTitle("💻 New Feature Request")
        .setDescription(`**${content.slice(0, 2000)}**`)
        .addFields(reportFields)
        .setThumbnail(message.author.displayAvatarURL())
        .setColor(0xffcc00)
        .setTimestamp();

      if (imageUrl) {
        reportEmbed.setImage(imageUrl);
      }

      if (!reportsChannel.isTextBased()) {
        console.error("Support channel is not text based.");
        return message.reply(
          "Feature request channel is not configured correctly.",
        );
      }

      await reportsChannel.send({
        embeds: [reportEmbed],
      });

      await message.react(check);

      const successFields: APIEmbedField[] = [
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
      ];

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("💻 Feature Request Sent")
            .setDescription(
              "Your feature request has been submitted to bot developers successfully.",
            )
            .setFields(successFields),
        ],
      });
    } catch (err) {
      console.error(err);
      return message.reply("Error submitting feature request.");
    }
  },
};
