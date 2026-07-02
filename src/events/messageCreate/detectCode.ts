import {
  EmbedBuilder,
  PermissionFlagsBits,
  type Client,
  type Message,
} from "discord.js";
import { detectCode } from "../../utils/detectCode.ts";

export default async (client: Client, message: Message) => {
  if (message.author.bot) return;
  if (
    !message.guild?.members.me?.permissions.has(
      PermissionFlagsBits.ManageMessages,
    )
  )
    return;

  const content = message.content;
  const { isCode, score, sections } = detectCode(content);

  if (!isCode) return;

  // attempt to delete the message, if fail, return
  try {
    await message.delete();
  } catch (error) {
    // console.error("Failed to delete message:", error);
    return;
  }

  const embed = new EmbedBuilder()
    .setAuthor({
      name: message.author.tag,
      iconURL: message.author.displayAvatarURL(),
    })
    .setColor("#FF0000")
    // .setTitle(`<@${message.author.id}> said:`)
    .setDescription(
      sections
        .map((section) =>
          section.type === "code"
            ? `\`\`\`${section.language || "txt"}\n${section.text}\`\`\``
            : section.text,
        )
        .join("\n\n"),
    );

  const channel = message.channel;
  if (channel.isTextBased() && "send" in channel) {
    await channel.send({
      content: `<@${message.author.id}> said:`,
      embeds: [embed],
    });
  }
};
