import { AttachmentBuilder, MessageFlags } from "discord.js";

import config from "../../../config.json" with { type: "json" };
import type { CommandCallbackOpts } from "../../types/command.ts";
import type { GitHubTreeEntry, RepoInfo, TreeNode } from "../../types/tree.ts";

import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

function parseRepo(url: string): RepoInfo | null {
  // Remove protocol and www
  url = url.replace(/^(https?:\/\/)?(www\.)?/, "");
  // If starts with github.com, remove it
  if (url.startsWith("github.com/")) {
    url = url.slice("github.com/".length);
  }
  // Now should be owner/repo
  const parts = url.split("/");
  const owner = parts[0];
  const repo = parts[1]?.replace(".git", "");
  if (owner && repo) {
    return {
      owner,
      repo,
    };
  }
  return null;
}

// Build nested structure
function buildTree(paths: string[], maxDepth = 2): TreeNode {
  const root: TreeNode = {};

  for (const path of paths) {
    const parts = path.split("/").slice(0, maxDepth);

    let current: TreeNode = root;

    for (const part of parts) {
      current[part] ??= {};
      current = current[part];
    }
  }

  return root;
}

// Format to ASCII tree
function formatTree(obj: TreeNode, prefix = ""): string {
  const entries = Object.keys(obj);
  let result = "";

  entries.forEach((key, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";

    const child = obj[key] ?? {};
    const isFolder = Object.keys(child).length > 0;
    const icon = isFolder ? "📁 " : "📄 ";

    result += `${prefix}${connector}${icon}${key}\n`;

    if (isFolder) {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      result += formatTree(child, newPrefix);
    }
  });

  return result;
}

export default {
  name: "tree",
  description: "View GitHub repository structure",
  usage: "tree <github repo link> [depth]",
  premium: true,
  async callback({ client, message, args }: CommandCallbackOpts) {
    const { emojis } = config;
    const { check, x, tick } = emojis;

    if (!args[0]) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Invalid Usage",
          description:
            "Usage: `;tree <github repo link> [depth]`\nExample: `;tree https://github.com/user/repo 2`",
        }),
      });
    }

    const depth = Math.min(Number.parseInt(args[1] ?? "2", 10) || 2, 5);

    const match = args[0].match(
      /^(?:(?:https?:\/\/)?(?:www\.)?github\.com\/)?([^\/]+)\/([^\/]+)(?:\.git)?$/i,
    );
    if (!match) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Invalid Usage",
          description:
            "Usage: `;tree <github repo link> [depth]`\nExample: `;tree https://github.com/user/repo 2`",
        }),
      });
    }

    const repoLink = args[0];

    try {
      const reaction = await message.react(tick);

      const repoInfo = parseRepo(repoLink);
      if (!repoInfo) {
        throw new Error("Invalid repository link");
      }
      const { owner, repo } = repoInfo;

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

      const paths = (treeData.tree as GitHubTreeEntry[])
        .filter(
          (f): f is GitHubTreeEntry & { path: string } =>
            f.type === "blob" && typeof f.path === "string",
        )
        .map((f) => f.path);

      const tree = buildTree(paths, depth);
      const output = formatTree(tree);

      await reaction.users.remove(client.user!.id).catch(() => {});

      if (output.length > 1800) {
        const buffer = Buffer.from(output, "utf-8");

        const file = new AttachmentBuilder(buffer, {
          name: `${repo}-tree.txt`,
        });

        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          files: [file],
          components: buildComponents([
            {
              type: "container",
              accentColor: 0x22c55e,
              components: [
                {
                  type: "text",
                  content: "### ✅ Repository Tree",
                },
                {
                  type: "text",
                  content:
                    "The repository structure is too large to display inline.\nIt has been attached as a file below.",
                },
                {
                  type: "separator",
                  spacing: "small",
                },
                {
                  type: "file",
                  url: `attachment://${repo}-tree.txt`,
                },
                {
                  type: "separator",
                  spacing: "small",
                },
                {
                  type: "text",
                  content: `-# Repository: \`${owner}/${repo}\`\n-# Depth: \`${depth}\``,
                },
              ],
            },
          ]),
        });
      }

      await message.react(check);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x22c55e,
            components: [
              {
                type: "text",
                content: "### ✅ Repository Tree",
              },
              {
                type: "text",
                content: `Repository: \`${owner}/${repo}\`\nDepth: \`${depth}\``,
              },
              {
                type: "separator",
                spacing: "small",
              },
              {
                type: "text",
                content: `\`\`\`text\n${output}\n\`\`\``,
              },
            ],
          },
        ]),
      });
    } catch (err: unknown) {
      console.error(err);

      await message.react(x);

      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Failed to Fetch Repository",
          description: errorMessage,
        }),
      });
    }
  },
};
