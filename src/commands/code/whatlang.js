import { EmbedBuilder } from "discord.js";
import "dotenv/config";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default {
  name: "whatlang",
  description: "Detect programming language from code block",
  aliases: ["detectlang", "whichlang"],
  callback: async (client, message, args) => {
    if (message.author.bot) return;

    await message.react("⏳");
    const codeBlockMatch = message.content.match(
      /```(?:([\w#+.-]+)\n)?([\s\S]*?)```/,
    );
    const linkMatch = args[0]?.match(
      /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/,
    );

    let code;

    if (codeBlockMatch) {
      code = codeBlockMatch[2].trim();
    } else if (linkMatch) {
      const [, guildId, channelId, messageId] = linkMatch;
      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) throw new Error("Guild not found");

        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) throw new Error("Channel not found");

        const fetchedMessage = await channel.messages.fetch(messageId);

        const fetchedCodeBlock = fetchedMessage.content.match(
          /```(?:([\w#+.-]+)\n)?([\s\S]*?)```/,
        );

        if (!fetchedCodeBlock) {
          await message.reactions.removeAll();
          await message.react("❌");
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ No code block found!")
                .setColor(0xd21872),
            ],
          });
        }

        code = fetchedCodeBlock[2].trim();
      } catch (err) {
        await message.reactions.removeAll();
        await message.react("❌");
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Failed to fetch message")
              .setDescription(err.message)
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
      await message.reactions.removeAll();
      await message.react("❌");
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

      langsDetected =
        chatCompletion.choices?.[0]?.message?.content ||
        chatCompletion.choices?.[0]?.text ||
        "";
    } catch (err) {
      console.error("Suggest command error:", err);
      await message.reactions.removeAll();
      await message.react("⚠️");
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⚠️ Failed to get language detection")
            .setColor(0xd21872),
        ],
      });
    }

    if (!langsDetected.trim()) {
      await message.reactions.removeAll();
      await message.react("⚠️");
      return message.reply("⚠️ No languages detected.");
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
    await message.reactions.removeAll();
    await message.react("✅");
    return message.reply({ embeds: [embed] });
  },
};
