import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import path from "path";
import { fileURLToPath } from "url";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { readFile } from "../../utils/fileOps.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface VersionSection {
  title: string;
  content: string;
}

function parseChangelog(content: string): VersionSection[] {
  if (!content?.trim()) return [];

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
          embeds: [
            new EmbedBuilder()
              .setTitle("📝 Changelog")
              .setDescription("No changelog available.")
              .setColor(0x7289da),
          ],
        });
      }

      const latest = versions[0];

      const embed = new EmbedBuilder()
        .setTitle("📝 Latest Changes")
        .setDescription(
          latest?.content || "No changes listed for the latest version.",
        )
        .setColor(0x7289da);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("changelog_select")
        .setPlaceholder("Select a version to view its changes")
        .addOptions(
          versions.map((v, i) => ({
            label:
              v.title.length > 100 ? v.title.slice(0, 97) + "..." : v.title,
            value: i.toString(),
            ...(i === 0 ? { description: "Latest version" } : {}),
          })),
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        selectMenu,
      );

      await message.reply({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error("Error fetching changelog:", err);
    }
  },
};
