import { EmbedBuilder } from "discord.js";
import path, { join } from "path";
import { fileURLToPath } from "url";
import getAllFiles from "../../utils/getAllFiles.js";
import getConfig from "../../utils/getConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  name: "help",
  description:
    "Provides information about available commands and how to use them.",
  /**
   *
   * @param {Client} client
   * @param {Message} message
   */
  callback: async (client, message) => {
    const prefixCommandsPath = join(__dirname, "..", "..", "commands");
    const { prefixes, devs } = await getConfig();

    const prefixCommandsCategories = getAllFiles(prefixCommandsPath, true);

    const categoriesData = await Promise.all(
      prefixCommandsCategories.map(async (category) => {
        const categoryName = path.basename(category);
        const commandFiles = getAllFiles(category).filter(
          (file) => !file.endsWith("help.js"),
        );
        const allCommands = await Promise.all(
          commandFiles.map(async (file) => {
            let rel = path.relative(__dirname, file).replace(/\\/g, "/");
            if (!rel.startsWith(".")) rel = "./" + rel;
            const cmd = await import(rel);
            return cmd;
          }),
        );

        const commands = allCommands.filter((cmd) => !cmd.default.devOnly);

        const commandsInCategory = devs.includes(message.author.id)
          ? allCommands.map(
              (cmd) => `\`${cmd.default.name}\`: ${cmd.default.description}`,
            )
          : commands.map(
              (cmd) => `\`${cmd.default.name}\`: ${cmd.default.description}`,
            );
        return `**${categoryName}**\n${commandsInCategory.join("\n")}`;
      }),
    );
    const helpText = `
    Usage: \`${prefixes[0]}command\`
    \n${categoriesData.join("\n\n")}
    `;

    const embed = new EmbedBuilder()
      .setTitle("📘 Commands Guide")
      .setDescription(helpText.trim() || "No commands available.")
      .setColor(0x5865f2)
      .setFooter({
        text: `Requested by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL(),
      });
    return message.reply({ embeds: [embed] });
  },
};
