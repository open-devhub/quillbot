import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import fetch from "node-fetch";
import type { CommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "crate",
  description: "Search Rust crates",
  usage: "crate <crate name>",
  aliases: ["crates", "cargo"],
  react: "🦀",
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      const query = args.join(" ");
      if (!query) {
        return message.reply(
          "Please provide a search term, e.g. `;crate tokio`",
        );
      }

      const searchRes = await fetch(
        `https://crates.io/api/v1/crates?q=${encodeURIComponent(query)}&per_page=1`,
        {
          headers: { "User-Agent": "DiscordBot (contact@yourbotdomain.com)" },
        },
      );
      const searchData = await searchRes.json();

      if (!searchData.crates || searchData.crates.length === 0) {
        return message.reply(`¯\\_(ツ)_/¯ No crates found for **${query}**`);
      }

      const crate = searchData.crates[0];
      const name = crate.name;

      const description = crate.description
        ? crate.description.length > 800
          ? crate.description.slice(
              0,
              crate.description.lastIndexOf(" ", 800),
            ) + " ..."
          : crate.description
        : "No description available.";

      const embed = new EmbedBuilder()
        .setTitle(name)
        .setURL(`https://crates.io/crates/${name}`)
        .setDescription(description)
        .addFields(
          {
            name: "Version",
            value: crate.max_version || "Unknown",
            inline: true,
          },
          {
            name: "Author",
            value: "See Registry",
            inline: true,
          },
          {
            name: "Publisher",
            value: "See Registry",
            inline: true,
          },
          {
            name: "Recent Downloads",
            value: crate.recent_downloads?.toLocaleString() || "Unknown",
            inline: true,
          },
          {
            name: "Repository",
            value: crate.repository
              ? `[${crate.repository
                  .replace("https://github.com/", "")
                  .replace(".git", "")
                  .split("/")
                  .slice(-2)
                  .join("/")}](${crate.repository})`
              : "Unknown",
            inline: true,
          },
          {
            name: "License",
            value: crate.license || "Other",
            inline: true,
          },
        )
        .setThumbnail(
          "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Rust_programming_language_black_logo.svg/1200px-Rust_programming_language_black_logo.svg.png",
        )
        .setFooter({ text: "Source: crates.io" });

      const button = new ButtonBuilder()
        .setLabel("View on npm")
        .setLabel("View on crates.io")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://crates.io/crates/${name}`);

      const componentButtons = [button];
      if (crate.homepage) {
        componentButtons.push(
          new ButtonBuilder()
            .setLabel("Visit Homepage")
            .setStyle(ButtonStyle.Link)
            .setURL(crate.homepage),
        );
      }

      const row = new ActionRowBuilder().addComponents(...componentButtons);

      return message.reply({
        embeds: [embed],
        components: [row.toJSON()],
      });
    } catch (err) {
      console.error(err);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Failed to fetch crate results")
            .setDescription(
              "An error occurred while fetching results from crates.io.",
            )
            .setColor(0xd21872),
        ],
      });
    }
  },
};
