import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import fetch from "node-fetch";
import type { CommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "gem",
  description: "Search Ruby gems",
  usage: "gem <gem name>",
  aliases: ["gems", "gempkg"],
  react: "💎",
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      const query = args.join(" ");
      if (!query) {
        return message.reply("Please provide a search term, e.g. `;gem rails`");
      }

      const searchRes = await fetch(
        `https://rubygems.org/api/v1/search.json?query=${encodeURIComponent(query)}`,
      );

      if (!searchRes.ok) {
        throw new Error("RubyGems API failed to respond properly.");
      }

      const searchData = await searchRes.json();

      if (!searchData || searchData.length === 0) {
        return message.reply(`¯\\_(ツ)_/¯ No Ruby gems found for **${query}**`);
      }

      const gem = searchData[0];

      const description = gem.info
        ? gem.info.length > 800
          ? gem.info.slice(0, gem.info.lastIndexOf(" ", 800)) + " ..."
          : gem.info
        : "No description available.";

      const repoUrl = gem.source_code_uri || gem.homepage_uri || null;

      const repoDisplay =
        repoUrl && repoUrl.includes("github.com")
          ? `[${repoUrl.replace("https://github.com/", "").split("/").slice(0, 2).join("/")}](${repoUrl})`
          : repoUrl
            ? `[View Source](${repoUrl})`
            : "Unknown";

      const embed = new EmbedBuilder()
        .setTitle(gem.name)
        .setURL(`https://rubygems.org/gems/${gem.name}`)
        .setDescription(description)
        .addFields(
          {
            name: "Version",
            value: gem.version || "Unknown",
            inline: true,
          },
          {
            name: "Author",
            value: gem.authors || "Unknown",
            inline: true,
          },
          {
            name: "Publisher",
            value: gem.authors?.split(",")[0] || "Unknown",
            inline: true,
          },
          {
            name: "Total Downloads",
            value: gem.downloads?.toLocaleString() || "Unknown",
            inline: true,
          },
          {
            name: "Repository",
            value: repoDisplay,
            inline: true,
          },
          {
            name: "License",
            value: gem.licenses?.join(", ") || "Other",
            inline: true,
          },
        )
        .setThumbnail(
          "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/RubyGems_Logo_2015.svg/1200px-RubyGems_Logo_2015.svg.png",
        )
        .setFooter({ text: "Source: rubygems.org" })
        .setColor(0xe9573f);

      const buttons = [
        new ButtonBuilder()
          .setLabel("View on RubyGems")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://rubygems.org/gems/${gem.name}`),
      ];

      if (gem.homepage_uri) {
        buttons.push(
          new ButtonBuilder()
            .setLabel("Visit Homepage")
            .setStyle(ButtonStyle.Link)
            .setURL(gem.homepage_uri),
        );
      }

      if (gem.documentation_uri) {
        buttons.push(
          new ButtonBuilder()
            .setLabel("Docs")
            .setStyle(ButtonStyle.Link)
            .setURL(gem.documentation_uri),
        );
      }

      const row = new ActionRowBuilder().addComponents(...buttons);

      return message.reply({
        embeds: [embed],
        components: [row.toJSON()],
      });
    } catch (err) {
      console.error(err);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Failed to fetch RubyGems results")
            .setDescription(
              "An error occurred while fetching results from rubygems.org.",
            )
            .setColor(0xd21872),
        ],
      });
    }
  },
};
