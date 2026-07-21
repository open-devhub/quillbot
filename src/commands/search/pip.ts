import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import fetch from "node-fetch";
import type { CommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "pip",
  description: "Search PyPI packages",
  usage: "pip <package name>",
  aliases: ["pypi", "pipkg"],
  async callback({ message, args }: CommandCallbackOpts) {
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
        return message.reply(
          `¯\\_(ツ)_/¯ No PyPI packages found for **${query}**`,
        );
      }

      const info = pkgData.info;
      const latestVersion = info.version;

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
            name: "Publisher",
            value: info.maintainer || info.author || "Unknown",
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
            name: "License",
            value:
              (info.license || "Other").split("\n")[0].slice(0, 100) || "Other",
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
