import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import fetch from "node-fetch";
import type { CommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "wiki",
  description: "Search Wikipedia articles",
  usage: "wiki <term>",
  aliases: ["wikipedia", "wikisearch"],
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      const query = args.join(" ");
      if (!query) {
        return message.reply(
          "Please provide a search term, e.g. `++wiki JavaScript`",
        );
      }

      const controller1 = new AbortController();
      const timeoutId1 = setTimeout(() => controller1.abort(), 10000);
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          query,
        )}&utf8=&format=json`,
        { signal: controller1.signal as any, timeout: 10000 },
      );
      clearTimeout(timeoutId1);
      const data = await res.json();

      if (!data.query || !data.query.search || data.query.search.length === 0) {
        return message.reply(
          `¯\\_(ツ)_/¯ No Wikipedia results found for **${query}**`,
        );
      }

      const article = data.query.search[0];
      const title = article.title;
      const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
      const pageRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=300&format=json&titles=${encodeURIComponent(title)}`,
        { signal: controller2.signal as any, timeout: 10000 },
      );
      clearTimeout(timeoutId2);
      const pageData = await pageRes.json();
      const page = Object.values(pageData.query.pages)[0] as {
        extract?: string;
        thumbnail?: { source?: string };
      };
      const extract = page?.extract ?? "No extract available.";
      const thumbnail = page?.thumbnail?.source ?? null;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setURL(url)
        .setDescription(
          extract.length > 800
            ? extract.slice(0, extract.lastIndexOf(" ", 800)) + " ..."
            : extract,
        )
        .setFooter({ text: "Source: wikipedia.org" });
      if (thumbnail) embed.setThumbnail(thumbnail);

      const button = new ButtonBuilder()
        .setLabel("Read on Wikipedia")
        .setStyle(ButtonStyle.Link)
        .setURL(url);
      const row = new ActionRowBuilder().addComponents(button);

      return message.reply({ embeds: [embed], components: [row.toJSON()] });
    } catch (err: unknown) {
      const error = err as { name?: string; code?: string };
      if (error.name === "AbortError" || error.code === "ETIMEDOUT") {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("⏱️ Wikipedia request timed out")
              .setDescription(
                "The request to Wikipedia took too long and was aborted.",
              )
              .setColor(0xd21872),
          ],
        });
      } else {
        console.error(err);
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Failed to fetch Wikipedia results")
              .setDescription(
                "An error occurred while fetching results from Wikipedia.",
              )
              .setColor(0xd21872),
          ],
        });
      }
    }
  },
};
