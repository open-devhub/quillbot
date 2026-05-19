import { EmbedBuilder } from "discord.js";
import ucid from "unique-custom-id";
import getConfig from "../../utils/getConfig.js";

export default {
  name: "report",
  description: "Report a bug or issue with the bot",
  usage: "%preport <description> [image attachment]",
  aliases: ["bug", "issue"],
  callback: async (client, message, args) => {
    try {
      const { emojis, support, premiumServer } = await getConfig();
      const { check, x } = emojis;
      const { reports } = support;

      const reportId = ucid.format("mini");

      const content = args.join(" ");
      if (!content) {
        return message.reply("Please describe the issue you want to report.");
      }

      const guild = await client.guilds.fetch(premiumServer);
      const reportsChannel = await guild.channels.fetch(reports);

      if (!guild || !reportsChannel) {
        console.error("Reporting system not configured properly.");
        return message.reply("Reporting system not configured yet.");
      }

      const attachment = message.attachments.first();
      const imageUrl = attachment?.url || null;

      const reportEmbed = new EmbedBuilder()
        .setTitle("🐛 New Bug Report")
        .setDescription(`**${content.slice(0, 2000)}**`)
        .addFields(
          {
            name: "Report ID",
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
            .setTitle("🐛 Bug Reported")
            .setDescription("Your report has been submitted successfully.")
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
      return message.reply("Error reporting issue to bot developers.");
    }
  },
};
