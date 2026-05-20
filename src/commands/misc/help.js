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
  usage: "%phelp [command]",
  aliases: ["welp", "h"],
  /**
   *
   * @param {Client} client
   * @param {Message} message
   */
  callback: async (client, message, args) => {
    try {
      const prefixCommandsPath = join(__dirname, "..", "..", "commands");
      const { prefixes, devs } = await getConfig();

      const prefixCommandsCategories = getAllFiles(
        prefixCommandsPath,
        true,
      ).filter((c) => !c.split("/").at(-1).startsWith("!"));

      if (args[0]) {
        const allCommands = [];
        for (const category of prefixCommandsCategories) {
          const commandFiles = getAllFiles(category);
          for (const file of commandFiles) {
            let rel = path.relative(__dirname, file).replace(/\\/g, "/");
            if (!rel.startsWith(".") && !rel.startsWith("/")) rel = `./${rel}`;
            const cmd = await import(rel);
            allCommands.push(cmd.default);
          }
        }

        const command =
          allCommands.find(
            (c) =>
              c.name.toLowerCase() === args[0].toLowerCase() ||
              (c.aliases &&
                c.aliases.some(
                  (a) => a.toLowerCase() === args[0].toLowerCase(),
                )),
          ) || null;

        if (!command) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ Command not found!")
                .setDescription(
                  `No command named \`${args[0]}\` found. Use \`${prefixes[0]}help\` to see all commands.`,
                )
                .setColor(0xd21872),
            ],
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`${command.premium ? "★" : "⌬"} ${command.name}`)
          .setDescription(command.description)
          .addFields(
            {
              name: "Usage",
              value:
                `\`${command.usage.replace("%p", prefixes[0])}\`` ||
                `\`${prefixes[0]}${command.name}\``,
            },
            {
              name: "Aliases",
              value:
                Array.isArray(command.aliases) && command.aliases.length
                  ? command.aliases.map((a) => `\`${a}\``).join(", ")
                  : "None",
            },
          )
          .setColor(0x5865f2);

        return message.reply({ embeds: [embed] });
      }

      const categoriesData = await Promise.all(
        prefixCommandsCategories.map(async (category) => {
          const categoryName = path.basename(category);
          const commandFiles = getAllFiles(category);
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
                (cmd) =>
                  `${cmd.default.devOnly ? "⧉" : cmd.default.premium ? "★" : "⌬"} \`${cmd.default.name}\` • ${cmd.default.description}`,
              )
            : commands.map(
                (cmd) =>
                  `${cmd.default.premium ? "★" : "⌬"} \`${cmd.default.name}\` • ${cmd.default.description}`,
              );
          return `**${categoryName
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")}**\n${commandsInCategory.join("\n")}`;
        }),
      );
      categoriesData.push(
        ...categoriesData.splice(
          categoriesData.findIndex((c) => c.toLowerCase().includes("support")),
          1,
        ),
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
    } catch (err) {
      console.error(err);

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Failed to load help")
            .setDescription(err.message)
            .setColor(0xd21872),
        ],
      });
    }
  },
};
