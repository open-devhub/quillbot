import { MessageFlags } from "discord.js";
import "dotenv/config";
import { Groq } from "groq-sdk";
import config from "../../../config.json" with { type: "json" };
import type { CommandCallbackOpts } from "../../types/command.ts";
import {
  parseCodeBlock,
  parseCodeCommandInput,
} from "../../utils/code/codeInput.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default {
  name: "whatlang",
  description: "Detect the programming language of a code snippet",
  usage: "whatlang\n<codeblock | message link>",
  aliases: ["detectlang", "whichlang"],
  async callback({ client, message, args }: CommandCallbackOpts) {
    const { emojis } = config;
    const { check, x, tick, warn } = emojis;

    const reaction = await message.react(tick);
    const { codeBlock: parsedBlock, link } = parseCodeCommandInput(
      message.content,
      args,
    );

    let code: string | undefined;

    if (parsedBlock) {
      code = parsedBlock.code;
    } else if (link) {
      const [, guildId, channelId, messageId] =
        link.match(/https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/) ??
        [];
      try {
        if (!guildId || !channelId || !messageId) {
          throw new Error("Invalid Discord link provided.");
        }
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
              title: "❌ No Code Block Found!",
            }),
          });
        }

        code = fetchedCodeBlock?.code?.trim();
      } catch (err) {
        await reaction.users.remove(client.user!.id).catch(() => {});
        await message.react(x);
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Failed to Fetch Message",
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
          title: "❌ Format Error!",
          description:
            "Use `;whatlang` with a code block (or pass a message link).",
        }),
      });
    }

    let langsDetected = "";
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `List all the programming languages this code is valid in. Only return programming language names, separated by commas if multiple.

\`\`\`\n${code}\n\`\`\``,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        max_completion_tokens: 640,
        top_p: 1,
      });

      langsDetected = chatCompletion.choices?.[0]?.message?.content || "";
    } catch (err) {
      console.error("whatlang command error:", err);
      await reaction.users.remove(client.user!.id).catch(() => {});
      await message.react(warn);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "⚠️ Failed to Get Language Detection",
        }),
      });
    }

    if (!langsDetected.trim()) {
      await reaction.users.remove(client.user!.id).catch(() => {});
      await message.react(warn);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "⚠️ No Languages Detected",
          description:
            "The bot could not detect any programming languages for the provided code.",
        }),
      });
    }

    const safeLangsDetected = langsDetected
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const list =
      safeLangsDetected.map((l, i) => `${i + 1}. **${l}**`).join("\n") ||
      "No languages detected";

    await reaction.users.remove(client.user!.id).catch(() => {});
    await message.react(check);

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: buildComponents([
        {
          type: "container",
          accentColor: 0x18d272,
          components: [
            {
              type: "text",
              content: `### 💡 Detected Language${safeLangsDetected.length > 1 ? "s" : ""}`,
            },
            { type: "text", content: list },
            { type: "separator", spacing: "small" },
            {
              type: "text",
              content: `-# ${message.author.tag} • ${safeLangsDetected[0] || "unknown"}`,
            },
          ],
        },
      ]),
    });
  },
};
