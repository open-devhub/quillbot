import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { man } from "../../utils/misc/man.ts";

export default {
  name: "man",
  description: "Search man pages",
  aliases: ["manual"],
  usage: "man <term>",
  react: "📖",
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      // returns  return {
      //   title,
      //   section,
      //   url,
      //   raw,
      //   sections,
      // };
      const term = args.join(" ");
      if (!term) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Missing Term")
              .setDescription(
                "Please provide a term to search for in the man pages.",
              )
              .setColor(0xff0000),
          ],
        });
      }

      const page = await man(term);
      if (!page) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Man Page Not Found")
              .setDescription(`No man page found for the term "${term}".`)
              .setColor(0xff0000),
          ],
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`${page.title}`)
        .setDescription(page.description || "No description available.")
        .setColor(0x7289da);

      const button = new ButtonBuilder()
        .setLabel("Read Full Man Page")
        .setStyle(ButtonStyle.Link)
        .setURL(page.url);
      const row = new ActionRowBuilder().addComponents(button);
      return message.reply({ embeds: [embed], components: [row.toJSON()] });
    } catch (err) {
      console.error(err);
      return message.reply("Failed to fetch man page.");
    }
  },
};
