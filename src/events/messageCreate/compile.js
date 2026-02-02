const { Groq } = require('groq-sdk');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

module.exports = async (client, message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(';compile')) return;

  await message.react('⏳');
  const match = message.content.match(/```(\w+)\n([\s\S]*?)```/);

  if (!match) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Format error!')
      .setDescription(`Use ;compile command with code block under (language specified)`)
      .setColor(0xd21872)
      .setTimestamp();
    await message.reactions.removeAll();
    await message.react('❌');
    return message.reply({ embeds: [embed] });
  }

  const lang = match[1];
  const code = match[2].trim();

  try {
    const output = await runCode(lang, code);

    if (!output.trim()) {
      await message.reactions.removeAll();
      await message.react('⚠️');
      return message.reply('⚠️ No output returned.');
    }

    const safeOutput = output.slice(0, 1900);
    const lineCount = safeOutput.split('\n').length;
    const charCount = safeOutput.length;
    let isError = false;

    if (lineCount > 5 || charCount > 300) {
      const checkCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: `Given the following bot code:\n\`\`\`${lang}\n${code}\n\`\`\`\n\nAnd the following output:\n\`\`\`\n${safeOutput}\n\`\`\`\n\nDoes this output indicate an error? Respond ONLY with YES or NO.`,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        top_p: 0.3,
        max_completion_tokens: 10,
      });

      const checkResult = checkCompletion.choices[0].message.content.trim();
      isError = checkResult.toUpperCase().includes('YES');
    }

    const embed = new EmbedBuilder()
      .setTitle('🧪 Output')
      .setDescription(`\`\`\`\n${safeOutput}\n\`\`\``)
      .setColor(0x18d272)
      .setFooter({ text: `${message.author.tag} | ${lang}` })
      .setTimestamp();

    await message.reactions.removeAll();
    await message.react('✅');

    if (isError) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('explain_fix')
          .setLabel('Explain and Fix')
          .setStyle(ButtonStyle.Success)
      );

      const sent = await message.reply({ embeds: [embed], components: [row] });

      const collector = sent.createMessageComponentCollector({
        componentType: 'BUTTON',
        time: 60_000,
      });

      collector.on('collect', async (interaction) => {
        if (interaction.customId === 'explain_fix') {
          await interaction.deferUpdate();

          const fixCompletion = await groq.chat.completions.create({
            messages: [
              {
                role: 'user',
                content: `Given the following bot code:\n\`\`\`${lang}\n${code}\n\`\`\`\n\nAnd the following output:\n\`\`\`\n${safeOutput}\n\`\`\`\n\nExplain the error and provide a way to fix it.`,
              },
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.8,
            max_completion_tokens: 640,
          });

          const fixText = fixCompletion.choices[0].message.content.trim().slice(0, 1900);

          const fixEmbed = new EmbedBuilder()
            .setTitle('🛠️ Error Fix')
            .setDescription(fixText)
            .setColor(0x18d272)
            .setFooter({ text: `${message.author.tag} | ${lang}` })
            .setTimestamp();

          return interaction.followUp({ embeds: [fixEmbed] });
        }
      });
    } else {
      return message.reply({ embeds: [embed] });
    }
  } catch (err) {
    const embed = new EmbedBuilder()
      .setTitle('❌ Error running code')
      .setDescription(`\`\`\`\n${err.message}\n\`\`\``)
      .setColor(0xd21872)
      .setTimestamp();
    await message.reactions.removeAll();
    await message.react('❌');
    return message.reply({ embeds: [embed] });
  }
};

async function runCode(lang, code) {
  const res = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: lang,
      version: '*',
      files: [{ content: code }],
    }),
  });

  const data = await res.json();
  return data.run.output || data.run.stderr || 'No output';
}
