import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  codeBlock,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import "dotenv/config";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Message} message
 */
export default async (client, message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(";compile")) return;

  const codeBlockMatch = message.content.match(/```([\w#+.-]+)\n([\s\S]*?)```/);
  const linkMatch = message.content.match(
    /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/,
  );

  let lang, code;

  if (codeBlockMatch) {
    // PRIORITIZE code block in current message
    lang = codeBlockMatch[1];
    code = codeBlockMatch[2].trim();
  } else if (linkMatch) {
    // fetch message by link
    const [_, guildId, channelId, messageId] = linkMatch;

    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) throw new Error("Guild not found");

      const channel = guild.channels.cache.get(channelId);
      if (!channel?.isTextBased())
        throw new Error("Channel not found or not text-based");

      const fetchedMessage = await channel.messages.fetch(messageId);
      const fetchedCodeBlock = fetchedMessage.content.match(
        /```([\w#+.-]+)\n([\s\S]*?)```/,
      );

      if (!fetchedCodeBlock) {
        const embed = new EmbedBuilder()
          .setTitle("❌ No code found in linked message!")
          .setColor(0xd21872)
          .setTimestamp();
        return message.reply({ embeds: [embed] });
      }

      lang = fetchedCodeBlock[1];
      code = fetchedCodeBlock[2].trim();
    } catch (err) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Failed to fetch message")
        .setDescription(err.message)
        .setColor(0xd21872)
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }
  } else {
    const embed = new EmbedBuilder()
      .setTitle("❌ Format error!")
      .setDescription(
        `Use ;compile with either a code block or a message link containing a code block.`,
      )
      .setColor(0xd21872)
      .setTimestamp();
    await message.react("❌");
    return message.reply({ embeds: [embed] });
  }

  // Now we have `lang` and `code`, proceed with the existing compilation logic
  try {
    const reaction = await message.react("⏳");
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
      return message.reply({ embeds: [embed] });
    }

    embed.setTitle("❌ Compilation error!").setColor(0xd21872);

    if (!output.success)
      embed.setDescription("Failed to request code execution.");
    else if (output.exitCode !== 0)
      embed.setDescription(`Exit code: ${output.exitCode}`);

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
        if (interaction.customId !== "explain_fix") return;
        if (explained) {
          await interaction.deferUpdate().catch(() => {});
          return;
        }
        explained = true;
        await interaction.deferReply();

        const content = [`Given the following code:`, codeBlock(lang, code)];
        if (output.stdout)
          content.push(`With stdout:`, codeBlock(output.stdout.slice(0, 1000)));
        if (output.stderr)
          content.push(`With stderr:`, codeBlock(output.stderr.slice(0, 1000)));
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
        if (!explained) sent.edit({ components: [] }).catch(() => {});
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
