import { MessageFlags, StringSelectMenuInteraction } from "discord.js";
import path from "path";
import { fileURLToPath } from "url";
import { buildComponents } from "../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../utils/components/buildError.ts";
import { readFile } from "../utils/fs/fileOps.ts";
import { parseChangelog } from "../utils/parse/parseChangelog.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  id: "changelog_select",
  async callback({
    interaction,
  }: {
    interaction: StringSelectMenuInteraction;
  }) {
    if (!interaction.isStringSelectMenu()) return;

    const selectedIndex = parseInt(interaction.values[0] ?? "0", 10);

    const changelogContent =
      (await readFile(path.join(__dirname, "..", "..", "CHANGELOG.md"))) || "";

    const versions = parseChangelog(changelogContent);

    if (!versions[selectedIndex]) {
      return interaction.reply({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: buildErrorComponent({
          title: "❌ Version Not Found",
          description: "The selected version could not be found.",
        }),
      });
    }

    const selected = versions[selectedIndex];

    await interaction.update({
      components: buildComponents([
        {
          type: "container",
          accentColor: 0x7289da,
          components: [
            { type: "text", content: "### 📝 Changelog" },
            {
              type: "text",
              content:
                selected.content || "No changes listed for this version.",
            },
            { type: "separator", spacing: "small" },
            {
              type: "text",
              content: `-# Viewing: ${selected.title}`,
            },
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
                    default: i === selectedIndex,
                    ...(i === 0 ? { description: "Latest version" } : {}),
                  })),
                },
              ],
            },
          ],
        },
      ]),
    });
  },
};
