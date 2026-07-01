import { EmbedBuilder } from "discord.js";
import path from "path";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { readFile } from "../../utils/fileOps.ts";

export default {
  name: "changelog",
  description: "See the latest changes made to the bot.",
  usage: "%changelog",
  aliases: ["changes", "updates"],
  async callback({ message }: CommandCallbackOpts) {
    const changelog = await readFile(
      path.join(__dirname, "..", "..", "..", "CHANGELOG.md"),
    );
    const latestChanges =
      "## " +
      changelog
        ?.split(/^## /m)[1]
        ?.trim()
        .replace(/\r?\n\r?\n/g, "\n");

    const changelogEmbed = new EmbedBuilder()
      .setTitle("📝 Latest Changes")
      .setDescription(latestChanges || "No changelog available.")
      .setColor(0x7289da);

    await message.reply({ embeds: [changelogEmbed] });
  },
};
