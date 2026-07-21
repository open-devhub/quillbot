import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";
import { generateGitHubHeatMap } from "../../utils/misc/githubActivityGraph.ts";

export default {
  name: "profile",
  description: "Get information about a GitHub user/profile",
  usage: "profile <username | profile URL>",
  aliases: ["githubprofile", "user"],
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      const username = args[0];
      if (!username) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ No Username Provided",
            description:
              "Please provide a GitHub username or profile URL.\nExample: `;profile octocat` or `;profile https://github.com/octocat`",
          }),
        });
      }

      const match =
        username.match(
          /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)(?:\/([^\/]+))?(?:\.git)?$/i,
        ) || username.match(/^([^\/]+)$/);

      if (!match) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Invalid Username or URL",
            description:
              "Please provide a valid GitHub username or profile URL.\nExample: `;profile octocat` or `;profile https://github.com/octocat`",
          }),
        });
      }

      const user = match[1];
      const apiUrl = `https://api.github.com/users/${user}`;

      const res = await fetch(apiUrl);
      if (!res.ok) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ GitHub Profile Not Found",
            description:
              "Please provide a valid GitHub username or profile URL.\nExample: `;profile octocat`",
          }),
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
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Error",
          description: "An error occurred while fetching the user information.",
        }),
      });
    }
  },
};
