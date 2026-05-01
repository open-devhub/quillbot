import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  codeBlock,
  ComponentType,
  EmbedBuilder,
} from "discord.js";
import "dotenv/config";
import { Groq } from "groq-sdk";
import getConfig from "../../utils/getConfig.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let judge0Languages = null;

async function getLanguages() {
  // *fetch all Judge0 languages dynamically
  if (judge0Languages) return judge0Languages;

  const res = await fetch("https://ce.judge0.com/languages/");
  const data = await res.json();

  judge0Languages = data;
  return data;
}

//  Find best matching language ID

function findLanguageId(languages, lang) {
  lang = lang.toLowerCase();

  const aliases = {
    py: "python",
    js: "javascript",
    ts: "typescript",
    csharp: "c#",
    cpp: "c++",
    cs: "c#",
    go: "go",
    rb: "ruby",
    rs: "rust",
    kt: "kotlin",
    clj: "clojure",
    hs: "haskell",
    vbnet: "vb.net",
    vb: "vb.net",
  };

  if (aliases[lang]) lang = aliases[lang];

  const found = languages.find((l) => l.name.toLowerCase().includes(lang));

  return found?.id;
}

// run code with judge0 api
async function runCode(lang, code) {
  try {
    const languages = await getLanguages();
    const language_id = findLanguageId(languages, lang);

    if (!language_id) {
      return {
        success: false,
        stderr: `Unsupported language: ${lang}`,
      };
    }

    const res = await fetch("https://ce.judge0.com/submissions?wait=true", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language_id,
        source_code: code,
      }),
    });

    if (!res.ok) {
      return { success: false };
    }

    const data = await res.json();

    return {
      success: true,
      exitCode: data.status?.id ?? 0,
      stdout: data.stdout?.replace(/```/g, "`\u200b``"),
      stderr: (data.stderr || data.compile_output)?.replace(
        /```/g,
        "`\u200b``",
      ),
    };
  } catch (err) {
    console.error("Code execution error:", err);

    return {
      success: false,
      stderr: "Failed to execute code",
    };
  }
}

export default {
  name: "run",
  description: "Run code snippets in various programming languages",
  aliases: ["compile", "execute", "exec"],
  callback: async (client, message, args) => {
    const { emojis } = await getConfig();
    const { check, x, tick } = emojis;
    if (message.author.bot) return;

    const codeBlockMatch = message.content.match(
      /```([\w#+.-]+)\n([\s\S]*?)```/,
    );
    const linkMatch = args[0]?.match(
      /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/,
    );

    let lang, code;

    if (codeBlockMatch) {
      lang = codeBlockMatch[1];
      code = codeBlockMatch[2].trim();
    } else if (linkMatch) {
      const [_, guildId, channelId, messageId] = linkMatch;

      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) throw new Error("Guild not found");

        const channel = guild.channels.cache.get(channelId);
        if (!channel?.isTextBased()) throw new Error("Channel not found");

        const fetchedMessage = await channel.messages.fetch(messageId);

        const fetchedCodeBlock = fetchedMessage.content.match(
          /```([\w#+.-]+)\n([\s\S]*?)```/,
        );

        if (!fetchedCodeBlock) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ No code found to compile!")
                .setColor(0xd21872),
            ],
          });
        }

        lang = fetchedCodeBlock[1];
        code = fetchedCodeBlock[2].trim();
      } catch (err) {
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
      await message.react(x);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Format error!")
            .setDescription("Use ;compile with a code block or message link.")
            .setColor(0xd21872),
        ],
      });
    }

    try {
      const reaction = await message.react(tick);

      const output = await runCode(lang, code);

      await reaction.remove().catch(() => {});

      const embed = new EmbedBuilder()
        .setFooter({ text: `${message.author.tag} | ${lang}` })
        .setTimestamp();

      const isSuccess = output.success && output.exitCode === 3;

      if (!output.stdout && !output.stderr) {
        embed
          .setTitle("✅ Success!")
          .setDescription("Code executed without output.")
          .setColor(0x4caf50);
        await message.react(check);
        return message.reply({ embeds: [embed] });
      }

      if (output.stdout) {
        // embed.addFields({
        //   name: "Stdout:",
        //   value: codeBlock(output.stdout.slice(0, 1000)),
        // });
        embed.setDescription(codeBlock(output.stdout.slice(0, 1000)));
      }

      if (output.stderr) {
        // embed.addFields({
        //   name: "Stderr:",
        //   value: codeBlock(output.stderr.slice(0, 1000)),
        // });
        embed.setDescription(codeBlock(output.stderr.slice(0, 1000)));
      }

      if (isSuccess) {
        embed.setTitle("🧪 Output").setColor(0x4caf50);
        await message.react(check);
        return message.reply({ embeds: [embed] });
      }

      embed.setTitle("❌ Compilation error!").setColor(0xd21872);

      await message.react(x);

      if (output.stderr) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("explain_fix")
            .setLabel("Explain and Fix")
            .setStyle(ButtonStyle.Success),
        );

        const sent = await message.reply({
          embeds: [embed],
          components: [row],
        });

        const collector = sent.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60_000,
          filter: (i) => i.user.id === message.author.id,
        });

        let explained = false;

        collector.on("collect", async (interaction) => {
          if (explained) return;
          explained = true;

          await interaction.deferReply();

          try {
            const fixCompletion = await groq.chat.completions.create({
              messages: [
                {
                  role: "user",
                  content: `Fix this code:\n${code}`,
                },
              ],
              model: "llama-3.3-70b-versatile",
            });

            const fixText = fixCompletion.choices[0].message.content.slice(
              0,
              1900,
            );

            await interaction.followUp({
              embeds: [
                new EmbedBuilder()
                  .setTitle("🛠️ Fix")
                  .setDescription(fixText)
                  .setColor(0x18d272),
              ],
            });

            await interaction.message.edit({ components: [] });
          } catch {
            explained = false;
          }
        });

        collector.on("end", () => {
          if (!explained) sent.edit({ components: [] }).catch(() => {});
        });
      } else {
        await message.reply({ embeds: [embed] });
      }
    } catch (err) {
      await message.react(x);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Error running code")
            .setDescription(`\`\`\`\n${err.message}\n\`\`\``)
            .setColor(0xd21872),
        ],
      });
    }
  },
};
