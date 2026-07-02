import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "../utils/fileOps.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface VersionSection {
  title: string;
  content: string;
}

function parseChangelog(content: string): VersionSection[] {
  if (!content?.trim()) return [];

  // Split on "## " headings (standard Keep a Changelog / conventional format)
  const parts = content.split(/^## /m);
  const versions: VersionSection[] = [];

  for (let i = 1; i < parts.length; i++) {
    const section = parts[i]?.trim();
    if (!section) continue;

    const firstNewline = section.indexOf("\n");
    const title = (
      firstNewline === -1 ? section : section.slice(0, firstNewline)
    ).trim();
    const body = (
      firstNewline === -1 ? "" : section.slice(firstNewline)
    ).trim();

    if (title) {
      versions.push({
        title,
        content: `## ${title}\n\n${body}`,
      });
    }
  }

  return versions;
}

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
        content: "❌ Selected version not found.",
        ephemeral: true,
      });
    }

    const selected = versions[selectedIndex];

    const embed = new EmbedBuilder()
      .setTitle("📝 Changelog")
      .setDescription(selected.content || "No changes listed for this version.")
      .setColor(0x7289da)
      .setFooter({ text: `Viewing: ${selected.title}` });

    // Rebuild the exact same dropdown so the user can switch versions again
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("changelog_select")
      .setPlaceholder("Select a version to view its changes")
      .addOptions(
        versions.map((v, i) => ({
          label: v.title.length > 100 ? v.title.slice(0, 97) + "..." : v.title,
          value: i.toString(),
          ...(i === selectedIndex
            ? { description: "Currently viewing" }
            : i === 0
              ? { description: "Latest version" }
              : {}),
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      selectMenu,
    );

    await interaction.update({
      embeds: [embed],
      components: [row],
    });
  },
};
