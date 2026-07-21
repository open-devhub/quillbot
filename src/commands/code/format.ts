import { MessageFlags, codeBlock } from "discord.js";
import prettier from "prettier";
import config from "../../../config.json" with { type: "json" };
import type { CommandCallbackOpts } from "../../types/command.ts";
import {
  parseCodeBlock,
  parseCodeCommandInput,
} from "../../utils/code/codeInput.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

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
  usage: "format\n<codeblock | message link>",
  aliases: ["prettier"],
  async callback({ client, message, args }: CommandCallbackOpts) {
    const { emojis } = config;
    const { check, x, tick } = emojis;

    const {
      codeBlock: parsedBlock,
      link,
      langFromArgs,
    } = parseCodeCommandInput(message.content, args);

    const reaction = await message.react(tick);

    if (!parsedBlock && !link) {
      await reaction.users.remove(client.user!.id).catch(() => {});
      await message.react(x);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: `❌ Format Error!`,
          description:
            "Provide a code block or a message link containing code.",
        }),
      });
    }

    let lang = "";
    let code = "";

    if (parsedBlock) {
      lang = parsedBlock.lang || langFromArgs || "";
      code = parsedBlock.code ?? "";
    } else if (link) {
      const [, guildId, channelId, messageId] =
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
          await reaction.users.remove(client.user!.id).catch(() => {});
          await message.react(x);
          return message.reply({
            flags: MessageFlags.IsComponentsV2,
            components: buildErrorComponent({
              title: `❌ No Code Found!`,
              description:
                "Provide a code block or a message link containing code.",
            }),
          });
        }

        lang = fetchedCodeBlock.lang || langFromArgs || "javascript";
        code = fetchedCodeBlock.code ?? "";
      } catch (err) {
        await reaction.users.remove(client.user!.id).catch(() => {});
        await message.react(x);
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: `❌ Failed to Fetch Message!`,
            description: String(err),
          }),
        });
      }
    } else {
      await reaction.users.remove(client.user!.id).catch(() => {});
      await message.react(x);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: `❌ Format Error!`,
          description:
            "Provide a code block or a message link containing code.",
        }),
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

      await reaction.users.remove(client.user!.id).catch(() => {});

      const components = buildComponents([
        {
          type: "container",
          accentColor: 0x22c55e,
          components: [
            {
              type: "text",
              content: "### ✅ Formatted Code",
            },
            {
              type: "text",
              content: codeBlock(lang || "js", formatted.slice(0, 4000)),
            },
            { type: "separator", spacing: "small" },
            {
              type: "text",
              content: `-# ${message.author.tag} • Prettier • Parser: ${parser}`,
            },
          ],
        },
      ]);

      await reaction.users.remove(client.user!.id).catch(() => {});
      await message.react(check);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components,
      });
    } catch (err) {
      console.error(err);
      await reaction.users.remove(client.user!.id).catch(() => {});
      await message.react(x);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Formatting Error!",
          description:
            "Unsupported language or invalid syntax. Use ;format with a code in a code block or message link, which is supported by Prettier.",
        }),
      });
    }
  },
};
