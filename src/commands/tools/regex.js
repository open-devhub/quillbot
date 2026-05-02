import { EmbedBuilder } from "discord.js";

export default {
  name: "regex",
  description: "Test and analyze regex patterns",
  aliases: ["regexp"],
  callback: async (client, message, args) => {
    try {
      const input = args.join(" ");
      const pattern = args[0];
      const text = args.slice(1).join(" ") || args[1] || "";

      if (!pattern || !text) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`❌ Regex error`)
              .setDescription(
                "Usage: `;regex <pattern> | <text>`\nExample: `;regex \\d+ | hello123 world456`",
              )
              .setColor(0xd21872),
          ],
        });
      }

      let regex;
      try {
        regex = new RegExp(pattern, "g");
      } catch {
        return message.reply({
          embeds: [
            new EmbedBuilder().setTitle(`❌ Invalid regex`).setColor(0xd21872),
          ],
        });
      }

      const matches = [...text.matchAll(regex)];

      if (matches.length === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`❌ No matches`)
              .setDescription(`Pattern: \`${pattern}\`\nText: \`${text}\``)
              .setColor(0xf59e0b),
          ],
        });
      }

      let highlighted = text;
      matches.forEach((m) => {
        highlighted = highlighted.replace(m[0], `**${m[0]}**`);
      });

      const matchDetails = matches
        .slice(0, 5)
        .map((m, i) => `#${i + 1} → \`${m[0]}\` (index: ${m.index})`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle(`✅ Regex Matches`)
        .setFields(
          { name: "Pattern", value: `\`${pattern}\`` },
          { name: "Matches Found", value: `${matches.length}` },
          { name: "Highlighted Text", value: highlighted.slice(0, 1024) },
          { name: "Match Details", value: matchDetails || "N/A" },
        )
        .setColor(0x22c55e);

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("Regex processing error.");
    }
  },
};
