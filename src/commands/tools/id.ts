import { EmbedBuilder } from "discord.js";
import ucid from "unique-custom-id";
import { map } from "unique-custom-id/format";
import type { CommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "id",
  description: "Generate a unique ID",
  usage: "id [format | list]",
  aliases: ["uuid", "uid"],
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      let format = args[0]?.toLowerCase() || "ucid";

      if (["formats", "list"].includes(format)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("✅ Available ID Formats")
              .setDescription(
                Object.keys(map)
                  .map((f) => `\`${f}\``)
                  .join(", "),
              )
              .setColor(0x00ff00),
          ],
        });
      }

      if (
        !args[0] ||
        !Object.keys(map).includes(args[0].toLowerCase()) ||
        !format
      ) {
        format = "uuid";
      }

      const id = ucid.format(format);
      const embed = new EmbedBuilder()
        .setTitle("✅ Generated Unique ID")
        .setDescription(`\`\`\`\n${id}\n\`\`\``)
        .setColor(0x00ff00);

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Failed to generate ID")
            .setDescription("An error occurred while generating the unique ID.")
            .setColor(0xd21872),
        ],
      });
    }
  },
};
