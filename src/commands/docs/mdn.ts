import { EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import TurndownService from "turndown";
import type { CommandCallbackOpts } from "../../types/command.js";

const turndown = new TurndownService();

export default {
  name: "mdn",
  description: "Search MDN Web Docs",
  aliases: ["mozilla", "mdnsearch"],
  usage: "%pmdn <term>",
  react: "📚",
  async callback({ client, message, args }: CommandCallbackOpts) {
    try {
      const query = args.join(" ");
      if (!query) {
        return message.reply(
          "Please provide a search term, e.g. `++mdn WeakMap`",
        );
      }

      const res = await fetch(
        `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`,
      );
      const data = await res.json();

      if (!data.documents || data.documents.length === 0) {
        return message.reply(
          `¯\\_(ツ)_/¯ No MDN results found for **${query}**`,
        );
      }

      const doc = data.documents[0];
      const rawExcerpt = doc.excerpt || "";
      const markdownExcerpt = rawExcerpt ? turndown.turndown(rawExcerpt) : "";
      const url = `https://developer.mozilla.org${doc.mdn_url}`;

      return message.reply(`${doc.title}: ${url}\n${markdownExcerpt}`);
    } catch (err) {
      console.error(err);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Failed to fetch MDN results")
            .setDescription(
              "An error occurred while fetching results from MDN Web Docs.",
            )
            .setColor(0xd21872),
        ],
      });
    }
  },
};
