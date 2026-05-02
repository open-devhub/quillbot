import { EmbedBuilder, codeBlock } from "discord.js";
import prettier from "prettier";
import getConfig from "../../utils/getConfig.js";

const parserMap = {
  js: "babel",
  javascript: "babel",
  ts: "typescript",
  typescript: "typescript",
  json: "json",
  html: "html",
  css: "css",
  scss: "scss",
  md: "markdown",
  markdown: "markdown",
  yaml: "yaml",
  yml: "yaml",
};

function detectParser(lang, code) {
  if (lang && parserMap[lang.toLowerCase()]) {
    return parserMap[lang.toLowerCase()];
  }

  if (code.trim().startsWith("{")) return "json";

  return "babel";
}

export default {
  name: "format",
  description: "Format code using Prettier",
  aliases: ["prettier"],
  callback: async (client, message, args) => {
    const { emojis } = await getConfig();
    const { check, x, tick } = emojis;

    const codeBlockMatch = message.content.match(
      /```([\w#+.-]*)\n([\s\S]*?)```/,
    );

    const linkMatch = args[0]?.match(
      /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/,
    );

    const reaction = await message.react(tick).catch(() => {});

    if (!codeBlockMatch && !linkMatch) {
      await reaction.remove().catch(() => {});
      await message.react(x);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`❌ Format error!`)
            .setDescription(
              "Provide a code block or a message link containing code.",
            )
            .setColor(0xd21872),
        ],
      });
    }

    let lang, code;

    if (codeBlockMatch) {
      lang = codeBlockMatch[1];
      code = codeBlockMatch[2].trim();
    } else if (linkMatch) {
      const [_, guildId, channelId, messageId] = linkMatch;

      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) throw new Error("Guild not found");

        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) throw new Error("Channel not found");

        const fetchedMessage = await channel.messages.fetch(messageId);

        const fetchedCodeBlock = fetchedMessage.content.match(
          /```([\w#+.-]*)\n([\s\S]*?)```/,
        );

        if (!fetchedCodeBlock) {
          await reaction.remove().catch(() => {});
          await message.react(x);
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`❌ No code found!`)
                .setColor(0xd21872),
            ],
          });
        }

        lang = fetchedCodeBlock[1];
        code = fetchedCodeBlock[2].trim();
      } catch (err) {
        await reaction.remove().catch(() => {});
        await message.react(x);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`❌ Failed to fetch message`)
              .setDescription(err.message)
              .setColor(0xd21872),
          ],
        });
      }
    } else {
      await reaction.remove().catch(() => {});
      await message.react(x);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`❌ Format error!`)
            .setDescription(
              "Provide a code block or a message link containing code.",
            )
            .setColor(0xd21872),
        ],
      });
    }

    try {
      const parser = detectParser(lang, code);

      let formatted;

      try {
        formatted = await prettier.format(code, { parser });
      } catch {
        formatted = await prettier.format(code, { parser: "babel" });
      }

      await reaction.remove().catch(() => {});

      const embed = new EmbedBuilder()
        .setTitle(`✅ Formatted Code`)
        .setDescription(codeBlock(lang || "js", formatted.slice(0, 4000)))
        .setColor(0x22c55e)
        .setFooter({
          text: `${message.author.tag} | Prettier | Parser: ${parser}`,
        })
        .setTimestamp();

      await reaction.remove().catch(() => {});
      await message.react(check);
      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await reaction.remove().catch(() => {});
      await message.react(x);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`❌ Formatting error`)
            .setDescription(
              "Unsupported language or invalid syntax. Use ;format with a code in a code block or message link, which is supported by Prettier.",
            )
            .setColor(0xd21872),
        ],
      });
    }
  },
};
