import { EmbedBuilder } from "discord.js";
import "dotenv/config";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default {
  name: "suggest",
  description: "Get suggestions to improve your code",
  aliases: ["suggestion", "improve", "codesuggestion"],
  premium: true,
  callback: async (client, message, args) => {
    if (message.author.bot) return;

    await message.react("⏳");
    const codeBlockMatch = message.content.match(/```(\w+)\n([\s\S]*?)```/);
    const linkMatch = args[0]?.match(
      /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/,
    );

    let lang, code;

    if (codeBlockMatch) {
      lang = codeBlockMatch[1];
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
          /```(\w+)\n([\s\S]*?)```/,
        );

        if (!fetchedCodeBlock) {
          await message.reactions.removeAll();
          await message.react("❌");
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ No code found to suggest!")
                .setColor(0xd21872),
            ],
          });
        }

        lang = fetchedCodeBlock[1];
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
          `Use ;suggestion command with code block (or pass a message link)`,
        )
        .setColor(0xd21872)
        .setTimestamp();
      await message.reactions.removeAll();
      await message.react("❌");
      return message.reply({ embeds: [embed] });
    }

    let suggestion = "";
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `Provide **very concise** suggestions to improve the following ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\``,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        max_completion_tokens: 640,
        top_p: 1,
      });

      suggestion =
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
            .setTitle("⚠️ Failed to get suggestions")
            .setColor(0xd21872),
        ],
      });
    }

    if (!suggestion.trim()) {
      await message.reactions.removeAll();
      await message.react("⚠️");
      return message.reply("⚠️ No suggestions available.");
    }

    const safeSuggestion = suggestion.slice(0, 1900);

    const embed = new EmbedBuilder()
      .setTitle("💡 Code Improvement Suggestions")
      .setDescription(safeSuggestion)
      .setColor(0x18d272)
      .setFooter({ text: `${message.author.tag} | ${lang}` })
      .setTimestamp();
    await message.reactions.removeAll();
    await message.react("✅");
    return message.reply({ embeds: [embed] });
  },
};
