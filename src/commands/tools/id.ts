import { Client, EmbedBuilder, Message } from "discord.js";
import ucid from "unique-custom-id";
import { map } from "unique-custom-id/format";

export default {
  name: "id",
  description: "Generate a unique ID",
  aliases: ["uuid", "uid"],
  callback: async (client: Client, message: Message, args: string[]) => {
    try {
      let format = args[0]?.toLowerCase();
      if (
        (args[0] && !Object.keys(map).includes(args[0]?.toLowerCase())) ||
        !format
      ) {
        format = "uuid";
      }

      const id = ucid.format(format);
      const embed = new EmbedBuilder()
        .setTitle("Generated Unique ID")
        .setDescription(`\`\`\`\n${id}\n\`\`\``)
        .setColor(0x00ff00);

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("Error generating unique ID.");
    }
  },
};
