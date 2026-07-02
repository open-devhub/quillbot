import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "../utils/fileOps.ts";
import { parseChangelog } from "../utils/parseChangelog.ts";

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
