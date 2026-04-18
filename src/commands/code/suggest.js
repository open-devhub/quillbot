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
    const match = message.content.match(/```(\w+)\n([\s\S]*?)```/);

    if (!match) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Format error!")
        .setDescription(
          `Use ;suggestion command with code block under (language specified)`,
        )
        .setColor(0xd21872)
        .setTimestamp();
      await message.reactions.removeAll();
      await message.react("❌");
      return message.reply({ embeds: [embed] });
    }

    const lang = match[1];
    const code = match[2].trim();

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
      stream: true,
      stop: null,
    });

    let suggestion = "";
    for await (const chunk of chatCompletion) {
      suggestion += chunk.choices[0]?.delta?.content || "";
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
