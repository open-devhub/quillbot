import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import path from "path";
import { fileURLToPath } from "url";
import type { CommandCallbackOpts } from "../../types/command.ts";
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
            label: (v.title.length > 100
              ? v.title.slice(0, 97) + "..."
              : v.title
            ).replace(/`/g, ""),
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
