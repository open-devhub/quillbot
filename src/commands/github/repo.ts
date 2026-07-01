import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "repo",
  description: "Get information about a GitHub repository",
  usage: "%prepo <repository URL>",
  aliases: ["githubrepo", "ghrepo"],
  react: "📦",
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      const repoUrl = args[0];
      if (!repoUrl) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ No repository URL provided")
              .setDescription(
                "Please provide a GitHub repository URL.\nExample: `;repo https://github.com/owner/repo`",
              )
              .setColor(0xd21872),
          ],
        });
      }

      // match URLs like:
      // https://github.com/owner/repo
      // owner/repo
      // github.com/owner/repo
      const match =
        repoUrl.match(
          /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\.git)?$/i,
        ) || repoUrl.match(/^([^\/]+)\/([^\/]+)$/);
      if (!match) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Invalid repository URL")
              .setDescription(
                "Please provide a valid GitHub repository URL.\nExample: `;repo https://github.com/owner/repo`",
              )
              .setColor(0xd21872),
          ],
        });
      }
      const owner = match[1];
      const repo = match[2]?.replace(/\.git$/, ""); // Remove .git if present
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

      fetch(apiUrl)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Repository not found");
          }
          return res.json();
        })
        .then((data) => {
          const description = data.description || "No description";
          const stars = data.stargazers_count || 0;
          const forks = data.forks_count || 0;
          const language = data.language || "Unknown";

          const embed = new EmbedBuilder()
            .setAuthor({
              name: data.owner.login,
              iconURL: data.owner.avatar_url,
              url: data.owner.html_url,
            })
            .setTitle(data.name)
            .setDescription(description)
            .setThumbnail(data.owner.avatar_url)
            .addFields(
              { name: "Stars", value: stars.toString(), inline: true },
              { name: "Forks", value: forks.toString(), inline: true },
              { name: "Language", value: language.toString(), inline: true },
              {
                name: "Watchers",
                value: data.watchers_count.toString(),
                inline: true,
              },
              {
                name: "Opened Issues",
                value: data.open_issues_count.toString(),
                inline: true,
              },
              {
                name: "License",
                value: data.license ? data.license.name : "No license",
                inline: true,
              },
            )
            // set footer with repo labels, #label for each
            .setFooter({
              text:
                data.topics && data.topics.length
                  ? `${data.topics.map((t: string) => `#${t}`).join(" ")}`
                  : `Requested by ${message.author.tag}`,
              iconURL: message.author.displayAvatarURL(),
            });

          const button = new ButtonBuilder()
            .setLabel("View on GitHub")
            .setStyle(ButtonStyle.Link)
            .setURL(data.html_url);
          const row = new ActionRowBuilder().addComponents(button);

          message.reply({ embeds: [embed], components: [row.toJSON()] });
        })
        .catch((err) => {
          console.error(err);
          message.reply(
            "An error occurred while fetching the repository information.",
          );
        });
    } catch (err) {
      console.error(err);
    }
  },
};
