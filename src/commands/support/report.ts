import { EmbedBuilder } from "discord.js";
import ucid from "unique-custom-id";
import type { CommandCallbackOpts } from "../../types/command.js";
import getConfig from "../../utils/getConfig.js";

export default {
  name: "report",
  description: "Report a bug or issue with the bot",
  usage: "%preport <description> [image attachment]",
  aliases: ["bug", "issue"],
  async callback({ client, message, args }: CommandCallbackOpts) {
    try {
      const { emojis, support, premiumServer } = await getConfig();
      const { check, x } = emojis;
      const { reports } = support;

      const reportId = ucid.format("mini");

      const content = args.join(" ");
      if (!content) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ No description provided")
              .setDescription(
                "Please provide a description of the issue you're experiencing.",
              )
              .setColor(0xd21872),
          ],
        });
      }

      const guild = await client.guilds.fetch(premiumServer);
      const reportsChannel = await guild.channels.fetch(reports);

      if (!guild || !reportsChannel) {
        console.error("Reporting system not configured properly.");
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Reporting system unavailable")
              .setDescription(
                "The reporting system is not set up correctly. Please contact the bot developers.",
              )
              .setColor(0xd21872),
          ],
        });
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
        .setThumbnail(message.author.displayAvatarURL({ size: 256 }))
        .setColor(0xffcc00)
        .setTimestamp();

      if (imageUrl) {
        reportEmbed.setImage(imageUrl);
      }

      if ("send" in reportsChannel) {
        await reportsChannel.send({
          embeds: [reportEmbed],
        });
      }

      await message.react(check);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("🐛 Bug Reported")
            .setDescription("Your report has been submitted successfully.")
            .setFields(
              {
                name: "ID",
                value: String(reportId),
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
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Error reporting issue")
            .setDescription("An error occurred while submitting your report.")
            .setColor(0xd21872),
        ],
      });
    }
  },
};
