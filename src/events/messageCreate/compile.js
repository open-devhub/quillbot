const { Groq } = require("groq-sdk");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  codeBlock,
} = require("discord.js");
const { ComponentType } = require("discord.js");
const { MessageFlags } = require("discord.js");
require("dotenv").config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 */
module.exports = async (client, message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(";compile")) return;

  const match = message.content.match(/```([\w#+.-]+)\n([\s\S]*?)```/);

  if (!match) {
    const embed = new EmbedBuilder()
      .setTitle("❌ Format error!")
      .setDescription(
        `Use ;compile command with code block under (language specified)`,
      )
      .setColor(0xd21872)
      .setTimestamp();

    await message.react("❌");

    return message.reply({ embeds: [embed] });
  }

  try {
    const reaction = await message.react("⏳");

    const lang = match[1];
    const code = match[2].trim();

    const output = await runCode(lang, code);

    await reaction.remove().catch(() => {});

    const embed = new EmbedBuilder()
      .setFooter({ text: `${message.author.tag} | ${lang}` })
      .setTimestamp();
    const isSuccess =
      output.success && (!output.stderr || output.stderr.trim() === "");

    if (output.stdout) {
      embed.addFields({
        name: "Stdout:",
        value: codeBlock(output.stdout.slice(0, 1000)),
      });
    }

    if (output.stderr) {
      embed.addFields({
        name: "Stderr:",
        value: codeBlock(output.stderr.slice(0, 1000)),
      });
    }

    if (isSuccess) {
      embed.setTitle("🧪 Output").setColor(0x4caf50);

      await message.react("✅");
      await message.reply({ embeds: [embed] });

      return;
    }

    embed.setTitle("❌ Compilation error!").setColor(0xd21872);

    if (!output.success) {
      embed.setDescription("Failed to request code execution.");
    } else if (output.exitCode !== 0) {
      embed.setDescription(`Exit code: ${output.exitCode}`);
    }

    await message.react("❌");

    if (output.stderr) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("explain_fix")
          .setLabel("Explain and Fix")
          .setStyle(ButtonStyle.Success),
      );

      const sent = await message.reply({ embeds: [embed], components: [row] });

      const collector = sent.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
        filter: (i) => i.user.id === message.author.id,
      });

      let explained = false;

      collector.on("collect", async (interaction) => {
        if (interaction.customId !== "explain_fix") {
          return;
        }

        // Check if the button has already been clicked to avoid multiple explanations
        if (explained) {
          await interaction.deferUpdate().catch(() => {});
          return;
        }
        explained = true;

        // Defer the reply to prevent the interaction from timing out
        try {
          await interaction.deferReply();
        } catch (error) {
          console.error("Failed to defer reply:", error);
          return;
        }

        const content = [`Given the following code:`, codeBlock(lang, code)];

        if (output.stdout) {
          content.push(`With stdout:`, codeBlock(output.stdout.slice(0, 1000)));
        }

        if (output.stderr) {
          content.push(`With stderr:`, codeBlock(output.stderr.slice(0, 1000)));
        }

        content.push(
          `Explain the error and provide a way to fix it as short as possible.`,
        );

        try {
          const fixCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: content.join("\n") }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.8,
            max_completion_tokens: 640,
          });

          const fixText = fixCompletion.choices[0].message.content
            .trim()
            .slice(0, 1900);

          const fixEmbed = new EmbedBuilder()
            .setTitle("🛠️ Error Fix")
            .setDescription(fixText)
            .setColor(0x18d272)
            .setFooter({ text: `${message.author.tag} | ${lang}` })
            .setTimestamp();

          await interaction.message.edit({ components: [] });
          await interaction.followUp({ embeds: [fixEmbed] });

          collector.stop();
        } catch (error) {
          explained = false;
          console.error("An error occurred while explaining the error:", error);

          const embed = new EmbedBuilder()
            .setTitle("❌ Error explaining error")
            .setDescription(`An error occurred while explaining the error`)
            .setColor(0xd21872)
            .setFooter({ text: `${message.author.tag} | ${lang}` })
            .setTimestamp();

          await interaction.followUp({ embeds: [embed] }).catch(() => {});
        }
      });

      collector.on("ignore", (i) => {
        i.reply({
          content: "This button is not for you.",
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      });

      collector.on("end", () => {
        if (!explained) {
          sent.edit({ components: [] }).catch(() => {});
        }
      });
    } else {
      await message.reply({ embeds: [embed] });
    }
  } catch (err) {
    const embed = new EmbedBuilder()
      .setTitle("❌ Error running code")
      .setDescription(`\`\`\`\n${err.message}\n\`\`\``)
      .setColor(0xd21872)
      .setTimestamp();
    await message.reactions.removeAll().catch(() => {});
    await message.react("❌");
    return message.reply({ embeds: [embed] });
  }
};

let wandboxCompilers = null;

async function getCompilers() {
  if (wandboxCompilers) return wandboxCompilers;

  const res = await fetch("https://wandbox.org/api/list.json");
  const data = await res.json();

  wandboxCompilers = data;
  return data;
}

async function runCode(lang, code) {
  try {
    const compilers = await getCompilers();

    const compiler = compilers.find((c) =>
      c.name.toLowerCase().includes(lang.toLowerCase()),
    );

    if (!compiler) {
      return {
        success: false,
        stderr: `Unsupported language: ${lang}`,
      };
    }

    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        compiler: compiler.name,
        code,
      }),
    });

    if (!res.ok) {
      return { success: false };
    }

    const data = await res.json();

    return {
      success: true,
      exitCode: data.status ?? 0,
      stdout: data.program_output?.replace(/```/g, "`\u200b``"),
      stderr: data.program_error?.replace(/```/g, "`\u200b``"),
    };
  } catch (err) {
    console.error("Code execution error:", err);

    return {
      success: false,
      stderr: "Failed to execute code",
    };
  }
}
