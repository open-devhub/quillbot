import { EmbedBuilder } from "discord.js";

export default ({
  interaction,
  channel = interaction.channel,
  title,
  description,
  color = 0x5865f2,
  fields = [],
  footer,
  reply = false,
}) => {
  const embed = new EmbedBuilder()
    .setTitle(title || "")
    .setDescription(description || "")
    .setColor(color);

  if (fields && fields.length) embed.addFields(fields);
  if (footer) embed.setFooter(footer);

  const shouldEdit =
    !!reply || !!interaction?.deferred || !!interaction?.replied;

  if (shouldEdit) return interaction.editReply({ embeds: [embed] });

  return channel.send({ embeds: [embed] });
};
