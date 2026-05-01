import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import fetch from "node-fetch";

export default {
  name: "npm",
  description: "Search npm packages",
  aliases: ["npmpkg"],
  react: "📦",
  callback: async (client, message, args) => {
    try {
      const query = args.join(" ");
      if (!query) {
        return message.reply(
          "Please provide a search term, e.g. `;npm express`",
        );
      }

      const searchRes = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(
          query,
        )}&size=1`,
      );
      const searchData = await searchRes.json();

      if (!searchData.objects || searchData.objects.length === 0) {
        return message.reply(
          `¯\\_(ツ)_/¯ No npm packages found for **${query}**`,
        );
      }

      const pkgBasic = searchData.objects[0].package;
      const name = pkgBasic.name;

      const pkgRes = await fetch(`https://registry.npmjs.org/${name}`);
      const pkgData = await pkgRes.json();

      const latestVersion = pkgData["dist-tags"]?.latest;
      const latest = pkgData.versions?.[latestVersion] || {};

      const dlRes = await fetch(
        `https://api.npmjs.org/downloads/point/last-week/${name}`,
      );
      const dlData = await dlRes.json();

      const downloads = dlData.downloads?.toLocaleString() || "Unknown";

      const embed = new EmbedBuilder()
        .setTitle(name)
        .setURL(`https://www.npmjs.com/package/${name}`)
        .setDescription(
          pkgBasic.description?.length > 800
            ? pkgBasic.description.slice(
                0,
                pkgBasic.description.lastIndexOf(" ", 800),
              ) + " ..."
            : pkgBasic.description || "No description available.",
        )
        .addFields(
          {
            name: "Version",
            value: latestVersion || "Unknown",
            inline: true,
          },
          {
            name: "Author",
            value:
              latest.author?.name || pkgBasic.publisher?.username || "Unknown",
            inline: true,
          },
          {
            name: "Publisher",
            value: pkgBasic.publisher?.username || "Unknown",
            inline: true,
          },
          {
            name: "Weekly Downloads",
            value: downloads,
            inline: true,
          },
          {
            name: "Repository",
            value: latest.repository?.url
              ? `[${latest.repository.url
                  .replace("git+", "")
                  .replace(".git", "")
                  .split("/")
                  .slice(-2)
                  .join("/")}](${latest.repository.url.replace("git+", "")})`
              : "Unknown",

            inline: true,
          },
          {
            name: "License",
            value: latest.license || "Other",
            inline: true,
          },
        )
        .setThumbnail(
          // npm logo red big
          "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Npm-logo.svg/1200px-Npm-logo.svg.png",
        )
        .setFooter({ text: "Source: npmjs.com" });

      const button = new ButtonBuilder()
        .setLabel("View on npm")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://www.npmjs.com/package/${name}`);

      const componentButtons = [button];
      if (latest.homepage) {
        componentButtons.push(
          new ButtonBuilder()
            .setLabel("Visit Homepage")
            .setStyle(ButtonStyle.Link)
            .setURL(latest.homepage),
        );
      }

      const row = new ActionRowBuilder().addComponents(...componentButtons);

      return message.reply({
        embeds: [embed],
        components: [row],
      });
    } catch (err) {
      console.error(err);
      return message.reply("Error fetching npm packages.");
    }
  },
};
