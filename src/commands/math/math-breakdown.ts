import { EmbedBuilder } from "discord.js";
import "dotenv/config";
import { Groq } from "groq-sdk";
import type { CommandCallbackOpts } from "../../types/command.ts";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default {
  name: "math-breakdown",
  description:
    "Provides a step-by-step breakdown of a mathematical expression.",
  usage: "%pmath-breakdown <expression>",
  aliases: ["math"],
  async callback({ message, args }: CommandCallbackOpts) {
    const expression = args.join(" ");

    if (!args || !expression || !message) return;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Provide a step-by-step breakdown of how to solve the following mathematical expression:\n\`\`\`\n${expression}\n\`\`\``,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_completion_tokens: 640,
      top_p: 1,
      stream: true,
      stop: null,
    });

    if (message.channel.isDMBased() === false) {
      message.channel.sendTyping();
    }
    let breakdown = "";
    for await (const chunk of chatCompletion) {
      breakdown += chunk.choices[0]?.delta?.content || "";
    }

    if (!breakdown.trim()) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("⚠️ No breakdown generated")
            .setDescription(
              "The bot was unable to generate a breakdown for the provided expression.",
            )
            .setColor(0xd21872),
        ],
      });
    }
    const safeBreakdown = breakdown.slice(0, 1900);

    const embed = new EmbedBuilder()
      .setTitle("🧮 Math Breakdown")
      .setDescription(safeBreakdown)
      .setColor(0x18d272)
      .setFooter({ text: `${message.author.tag} | math` })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  },
};
