import { MessageFlags } from "discord.js";
import path from "path";
import { fileURLToPath } from "url";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";
import { readFile } from "../../utils/fs/fileOps.ts";
import { parseChangelog } from "../../utils/parse/parseChangelog.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  name: "changelog",
  description: "See the latest changes made to the bot.",
  usage: "changelog",
  aliases: ["changes", "updates"],
  async callback({ message }: CommandCallbackOpts) {
    try {
      const changelogContent =
        (await readFile(
          path.join(__dirname, "..", "..", "..", "CHANGELOG.md"),
        )) || "";

      const versions = parseChangelog(changelogContent);

      if (versions.length === 0) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "📝 Changelog",
            description: "No changelog available.",
            color: 0x7289da,
          }),
        });
      }

      const latest = versions[0];

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x7289da,
            components: [
              { type: "text", content: "### 📝 Latest Changes" },
              {
                type: "text",
                content:
                  latest?.content ||
                  "No changes listed for the latest version.",
              },
              { type: "separator", spacing: "small" },
              {
                type: "actionRow",
                components: [
                  {
                    type: "stringSelect",
                    customId: "changelog_select",
                    placeholder: "Select a version to view its changes",
                    options: versions.map((v, i) => ({
                      label: (v.title.length > 100
                        ? v.title.slice(0, 97) + "..."
                        : v.title
                      ).replace(/`/g, ""),
                      value: i.toString(),
                      ...(i === 0 ? { description: "Latest version" } : {}),
                    })),
                  },
                ],
              },
            ],
          },
        ]),
      });
    } catch (err) {
      console.error("Error fetching changelog:", err);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Failed to Load Changelog",
          description: "An error occurred while reading the changelog.",
        }),
      });
    }
  },
};
