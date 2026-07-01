import { EmbedBuilder, codeBlock } from "discord.js";
import prettier from "prettier";
import config from "../../../config.json" with { type: "json" };
import type { CommandCallbackOpts } from "../../types/command.ts";
import {
  parseCodeBlock,
  parseCodeCommandInput,
} from "../../utils/codeInput.ts";

const parserMap: Record<string, string> = {
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

function detectParser(lang: string, code: string) {
  if (lang && parserMap[lang.toLowerCase()]) {
    return parserMap[lang.toLowerCase()];
  }

  if (code.trim().startsWith("{")) return "json";

  return "babel";
}

export default {
  name: "format",
  description: "Format code using Prettier",
  usage: "%pformat\n<codeblock | message link>",
  aliases: ["prettier"],
  async callback({ client, message, args }: CommandCallbackOpts) {
    const { emojis } = config;
    const { check, x, tick } = emojis;

    const {
      codeBlock: parsedBlock,
      link,
      langFromArgs,
    } = parseCodeCommandInput(message.content, args);

    const reaction = await message.react(tick).catch(() => {});

    if (!parsedBlock && !link) {
      await reaction?.remove().catch(() => {});
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

    let lang = "",
      code = "";

    if (parsedBlock) {
      lang = parsedBlock.lang || langFromArgs || "";
      code = parsedBlock.code ?? "";
    } else if (link) {
      const [_, guildId, channelId, messageId] =
        link.match(/https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/) ??
        [];

      if (!guildId || !channelId || !messageId) {
        throw new Error("Invalid Discord link provided.");
      }

      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) throw new Error("Guild not found");

        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) throw new Error("Channel not found");

        const fetchedMessage = await channel.messages.fetch(messageId);

        const fetchedCodeBlock = parseCodeBlock(fetchedMessage.content);

        if (!fetchedCodeBlock) {
          await reaction?.remove().catch(() => {});
          await message.react(x);
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`❌ No code found!`)
                .setColor(0xd21872),
            ],
          });
        }

        lang = fetchedCodeBlock.lang || langFromArgs || "javascript";
        code = fetchedCodeBlock.code ?? "";
      } catch (err) {
        await reaction?.remove().catch(() => {});
        await message.react(x);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`❌ Failed to fetch message`)
              .setDescription(String(err))
              .setColor(0xd21872),
          ],
        });
      }
    } else {
      await reaction?.remove().catch(() => {});
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

    const codeToFormat = code ?? "";

    try {
      const parser = detectParser(lang, codeToFormat) || "babel";

      let formatted;

      try {
        formatted = await prettier.format(codeToFormat, { parser });
      } catch {
        formatted = await prettier.format(codeToFormat, { parser: "babel" });
      }

      await reaction?.remove().catch(() => {});

      const embed = new EmbedBuilder()
        .setTitle(`✅ Formatted Code`)
        .setDescription(codeBlock(lang || "js", formatted.slice(0, 4000)))
        .setColor(0x22c55e)
        .setFooter({
          text: `${message.author.tag} | Prettier | Parser: ${parser}`,
        })
        .setTimestamp();

      await reaction?.remove().catch(() => {});
      await message.react(check);
      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await reaction?.remove().catch(() => {});
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
