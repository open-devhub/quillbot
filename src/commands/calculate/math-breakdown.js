import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import "dotenv/config";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default {
  name: "math-breakdown",
  description:
    "Provides a step-by-step breakdown of a mathematical expression.",
  options: [
    {
      name: "expression",
      description: "The mathematical expression to break down.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  callback: async (client, interaction) => {
    const expression = interaction.options.getString("expression");

    if (interaction.user.bot) return;

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

    let breakdown = "";
    for await (const chunk of chatCompletion) {
      breakdown += chunk.choices[0]?.delta?.content || "";
    }

    if (!breakdown.trim()) {
      return interaction.reply("⚠️ No breakdown available.");
    }
    const safeBreakdown = breakdown.slice(0, 1900);

    const embed = new EmbedBuilder()
      .setTitle("🧮 Math Breakdown")
      .setDescription(safeBreakdown)
      .setColor(0x18d272)
      .setFooter({ text: `${interaction.user.tag} | math` })
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  },
};
