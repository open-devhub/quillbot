import { EmbedBuilder } from "discord.js";
import "dotenv/config";
import { Groq } from "groq-sdk";
import config from "../../../config.json" with { type: "json" };
import type { CommandCallbackOpts } from "../../types/command.ts";
import {
  parseCodeBlock,
  parseCodeCommandInput,
} from "../../utils/codeInput.ts";

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

    let code;

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
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ No code block found!")
                .setColor(0xd21872),
            ],
          });
        }

        code = fetchedCodeBlock?.code?.trim();
      } catch (err) {
        await reaction.users.remove(client.user!.id).catch(() => {});
        await message.react(x);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Failed to fetch message")
              .setDescription(String(err))
              .setColor(0xd21872),
          ],
        });
      }
    } else {
      const embed = new EmbedBuilder()
        .setTitle("❌ Format error!")
        .setDescription(
          `Use ;whatlang command with code block (or pass a message link)`,
        )
        .setColor(0xd21872)
        .setTimestamp();
      await reaction.users.remove(client.user!.id).catch(() => {});
      await message.react(x);
      return message.reply({ embeds: [embed] });
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
      console.error("Suggest command error:", err);
      await reaction.users.remove(client.user!.id).catch(() => {});
      await message.react(warn);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⚠️ Failed to get language detection")
            .setColor(0xd21872),
        ],
      });
    }

    if (!langsDetected.trim()) {
      await reaction.users.remove(client.user!.id).catch(() => {});
      await message.react(warn);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⚠️ No languages detected")
            .setDescription(
              "The bot could not detect any programming languages for the provided code.",
            )
            .setColor(0xd21872),
        ],
      });
    }

    const safeLangsDetected = langsDetected
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const embed = new EmbedBuilder()
      .setTitle(
        `💡 Detected Language${safeLangsDetected.length > 1 ? "s" : ""}`,
      )
      .setDescription(
        safeLangsDetected.map((l, i) => `${i + 1}. **${l}**`).join("\n") ||
          "No languages detected",
      )
      .setColor(0x18d272)
      .setFooter({ text: `${message.author.tag} | ${safeLangsDetected[0]}` })
      .setTimestamp();
    await reaction.users.remove(client.user!.id).catch(() => {});
    await message.react(check);
    return message.reply({ embeds: [embed] });
  },
};
