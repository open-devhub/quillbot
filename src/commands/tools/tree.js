import { AttachmentBuilder, codeBlock, EmbedBuilder } from "discord.js";
import getConfig from "../../utils/getConfig.js";

function parseRepo(url) {
  // Remove protocol and www
  url = url.replace(/^(https?:\/\/)?(www\.)?/, "");
  // If starts with github.com, remove it
  if (url.startsWith("github.com/")) {
    url = url.slice("github.com/".length);
  }
  // Now should be owner/repo
  const parts = url.split("/");
  if (parts.length >= 2) {
    return {
      owner: parts[0],
      repo: parts[1].replace(".git", ""),
    };
  }
  return null;
}

// Build nested structure
function buildTree(paths, maxDepth = 2) {
  const root = {};

  for (const path of paths) {
    const parts = path.split("/").slice(0, maxDepth);

    let current = root;

    for (const part of parts) {
      if (!current[part]) current[part] = {};
      current = current[part];
    }
  }

  return root;
}

// Format to ASCII tree
function formatTree(obj, prefix = "") {
  const entries = Object.keys(obj);
  let result = "";

  entries.forEach((key, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";

    const isFolder = Object.keys(obj[key]).length > 0;
    const icon = isFolder ? "📁 " : "📄 ";

    result += `${prefix}${connector}${icon}${key}\n`;

    if (isFolder) {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      result += formatTree(obj[key], newPrefix);
    }
  });

  return result;
}

export default {
  name: "tree",
  description: "View GitHub repository structure",
  premium: true,
  callback: async (client, message, args) => {
    const { emojis } = await getConfig();
    const { check, x, tick } = emojis;

    const depth = Math.min(parseInt(args[1]) || 2, 5);

    const match = args[0].match(
      /^(?:(?:https?:\/\/)?(?:www\.)?github\.com\/)?([^\/]+)\/([^\/]+)(?:\.git)?$/i,
    );
    if (!match) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Invalid usage")
            .setDescription(
              "Usage: `;tree <github repo link> [depth]`\nExample: `;tree https://github.com/user/repo 2`",
            )
            .setColor(0xd21872),
        ],
      });
    }

    const repoLink = args[0];

    try {
      const reaction = await message.react(tick);

      const { owner, repo } = parseRepo(repoLink);

      // Get repo info (for default branch)
      const repoRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`,
      );

      if (!repoRes.ok) throw new Error("Repository not found");

      const repoData = await repoRes.json();
      const branch = repoData.default_branch;

      // Get tree
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      );

      const treeData = await treeRes.json();

      if (!treeData.tree) throw new Error("Failed to fetch tree");

      const paths = treeData.tree
        .filter((f) => f.type === "blob")
        .map((f) => f.path);

      const tree = buildTree(paths, depth);
      let output = formatTree(tree);

      await reaction.remove().catch(() => {});

      if (output.length > 1800) {
        const buffer = Buffer.from(output, "utf-8");

        const file = new AttachmentBuilder(buffer, {
          name: `${repo}-tree.txt`,
        });

        const embed = new EmbedBuilder()
          .setTitle(`✅ Repository Tree`)
          .setDescription(
            `Structure is too large to display.\nSent as file instead.`,
          )
          .setColor(0x22c55e)
          .setFooter({
            text: `${owner}/${repo} | depth: ${depth}`,
          });

        await message.react(check);
        return message.reply({ embeds: [embed], files: [file] });
      }

      const embed = new EmbedBuilder()
        .setTitle(`✅ Repository Tree`)
        .setDescription(codeBlock(output))
        .setColor(0x22c55e)
        .setFooter({
          text: `${owner}/${repo} | depth: ${depth}`,
        });

      await message.react(check);
      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);

      await message.react(x);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Failed to fetch repository")
            .setDescription(err.message)
            .setColor(0xd21872),
        ],
      });
    }
  },
};
