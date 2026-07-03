import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { generateGitHubHeatMap } from "../../utils/githubActivityGraph.ts";

export default {
  name: "profile",
  description: "Get information about a GitHub user/profile",
  usage: "profile <username | profile URL>",
  aliases: ["githubprofile", "user"],
  react: "💻",
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      const username = args[0];
      if (!username) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ No username provided")
              .setDescription(
                "Please provide a GitHub username or profile URL.\nExample: `;profile octocat` or `;profile https://github.com/octocat`",
              )
              .setColor(0xd21872),
          ],
        });
      }

      const match =
        username.match(
          /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)(?:\/([^\/]+))?(?:\.git)?$/i,
        ) || username.match(/^([^\/]+)$/);

      if (!match) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Invalid username or URL")
              .setDescription(
                "Please provide a valid GitHub username or profile URL.\nExample: `;profile octocat` or `;profile https://github.com/octocat`",
              )
              .setColor(0xd21872),
          ],
        });
      }

      const user = match[1];
      const apiUrl = `https://api.github.com/users/${user}`;

      const res = await fetch(apiUrl);
      if (!res.ok) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ GitHub Profile Not Found")
              .setDescription(
                "Please provide a valid GitHub username or profile URL.\nExample: `;profile octocat` or `;profile https://github.com/octocat`",
              )
              .setColor(0xd21872),
          ],
        });
      }

      const data = await res.json();

      const name = data.name;
      const bio = data.bio;
      const repos = data.public_repos || 0;
      const followers = data.followers || 0;
      const following = data.following || 0;

      let heatmapAttachment: AttachmentBuilder | null = null;
      try {
        const heatmapBuffer = await generateGitHubHeatMap(user || "");
        heatmapAttachment = new AttachmentBuilder(heatmapBuffer, {
          name: "heatmap.png",
        });
      } catch (err) {
        console.error("Failed to generate heatmap:", err);
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: data.login,
          iconURL: data.avatar_url,
          url: data.html_url,
        })
        .setTitle(name || data.login)
        .setDescription(bio || "No bio")
        .setThumbnail(data.avatar_url)
        .addFields(
          { name: "Public Repos", value: repos.toString(), inline: true },
          { name: "Followers", value: followers.toString(), inline: true },
          { name: "Following", value: following.toString(), inline: true },
        )
        // .setImage(graphUrl)
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL(),
        });

      if (heatmapAttachment) {
        embed.setImage("attachment://heatmap.png");
      }

      const button = new ButtonBuilder()
        .setLabel("View on GitHub")
        .setStyle(ButtonStyle.Link)
        .setURL(data.html_url);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

      await message.reply({
        embeds: [embed],
        components: [row.toJSON()],
        files: heatmapAttachment ? [heatmapAttachment] : [],
      });
    } catch (err) {
      console.error(err);
      message.reply("An error occurred while fetching the user information.");
    }
  },
};
