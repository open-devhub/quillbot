import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import fetch from "node-fetch";
import type { CommandCallbackOpts } from "../../types/command.js";

export default {
  name: "pip",
  description: "Search PyPI packages",
  usage: "%ppip <package name>",
  aliases: ["pypi", "pipkg"],
  react: "🐍",
  async callback({ client, message, args }: CommandCallbackOpts) {
    try {
      const query = args.join(" ");
      if (!query) {
        return message.reply(
          "Please provide a search term, e.g. `;pip requests`",
        );
      }

      const pkgRes = await fetch(
        `https://pypi.org/pypi/${encodeURIComponent(query)}/json`,
      );

      let pkgData;
      if (pkgRes.ok) {
        pkgData = await pkgRes.json();
      } else {
        const searchRes = await fetch(
          `https://pypi.org/search/?q=${encodeURIComponent(query)}&o=-zscore&c=&format=json`,
        );

        return message.reply(
          `¯\\_(ツ)_/¯ No PyPI packages found for **${query}**`,
        );
      }

      const info = pkgData.info;
      const latestVersion = info.version;
      const releases = pkgData.releases?.[latestVersion] || [];
      const latestRelease = releases[releases.length - 1];

      const dlRes = await fetch(
        `https://pypistats.org/api/packages/${encodeURIComponent(info.name.toLowerCase())}/recent`,
      );
      const dlData = dlRes.ok ? await dlRes.json() : null;
      const downloads = dlData?.data?.last_week?.toLocaleString() || "Unknown";

      const description =
        info.summary?.length > 800
          ? info.summary.slice(0, info.summary.lastIndexOf(" ", 800)) + " ..."
          : info.summary || "No description available.";

      const repoUrl =
        info.project_urls?.Source ||
        info.project_urls?.GitHub ||
        info.project_urls?.Repository ||
        info.project_urls?.Homepage ||
        null;

      const repoDisplay = repoUrl
        ? `[${repoUrl.replace("https://github.com/", "").split("/").slice(0, 2).join("/")}](${repoUrl})`
        : "Unknown";

      const embed = new EmbedBuilder()
        .setTitle(info.name)
        .setURL(`https://pypi.org/project/${info.name}`)
        .setDescription(description)
        .addFields(
          {
            name: "Version",
            value: latestVersion || "Unknown",
            inline: true,
          },
          {
            name: "Author",
            value: info.author || "Unknown",
            inline: true,
          },
          {
            name: "License",
            value:
              (info.license || "Other").split("\n")[0].slice(0, 100) || "Other",
            inline: true,
          },
          {
            name: "Weekly Downloads",
            value: downloads,
            inline: true,
          },
          {
            name: "Repository",
            value: repoDisplay,
            inline: true,
          },
          {
            name: "Python Requires",
            value: info.requires_python || "Not specified",
            inline: true,
          },
        )
        .setThumbnail(
          "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/PyPI_logo.svg/1200px-PyPI_logo.svg.png",
        )
        .setFooter({ text: "Source: pypi.org • Stats: pypistats.org" });

      const buttons = [
        new ButtonBuilder()
          .setLabel("View on PyPI")
          .setStyle(ButtonStyle.Link)
          .setURL(`https://pypi.org/project/${info.name}`),
      ];

      if (info.project_urls?.Homepage) {
        buttons.push(
          new ButtonBuilder()
            .setLabel("Visit Homepage")
            .setStyle(ButtonStyle.Link)
            .setURL(info.project_urls.Homepage),
        );
      }

      if (info.project_urls?.Documentation || info.docs_url) {
        buttons.push(
          new ButtonBuilder()
            .setLabel("Docs")
            .setStyle(ButtonStyle.Link)
            .setURL(info.project_urls?.Documentation || info.docs_url),
        );
      }

      const row = new ActionRowBuilder().addComponents(...buttons);

      return message.reply({ embeds: [embed], components: [row.toJSON()] });
    } catch (err) {
      console.error(err);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Failed to fetch PyPI results")
            .setDescription(
              "An error occurred while fetching results from PyPI.",
            )
            .setColor(0xd21872),
        ],
      });
    }
  },
};
