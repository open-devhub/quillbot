import type { Client, Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import path, { join } from "path";
import { fileURLToPath } from "url";
import config from "../../../config.json" with { type: "json" };
import type { CommandCallbackOpts } from "../../types/command.ts";
import getAllFiles from "../../utils/getAllFiles.ts";

type Command = {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  premium?: boolean;
  devOnly?: boolean;
};

type CommandModule = {
  default: Command;
};

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
  async callback({ client, message, args }: CommandCallbackOpts) {
    try {
      const prefixCommandsPath = join(__dirname, "..", "..", "commands");
      if (!config) {
        throw new Error("Unable to load configuration");
      }
      const { prefixes, devs } = config;
      const prefix = prefixes[0] ?? "";

      const prefixCommandsCategories = getAllFiles(
        prefixCommandsPath,
        true,
      ).filter((c: string) => !c?.split("/")?.at(-1)?.startsWith("!"));

      if (args[0]) {
        const allCommands: Command[] = [];
        for (const category of prefixCommandsCategories) {
          const commandFiles = getAllFiles(category);
          for (const file of commandFiles) {
            let rel = path.relative(__dirname, file).replace(/\\/g, "/");
            if (!rel.startsWith(".") && !rel.startsWith("/")) rel = `./${rel}`;
            const cmd = (await import(rel)) as CommandModule;
            allCommands.push(cmd.default);
          }
        }

        const command =
          allCommands.find(
            (c) =>
              c.name.toLowerCase() === args[0]?.toLowerCase() ||
              (c.aliases &&
                c.aliases.some(
                  (a: string) => a.toLowerCase() === args[0]?.toLowerCase(),
                )),
          ) || null;

        if (!command) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ Command not found!")
                .setDescription(
                  `No command named \`${args[0]}\` found. Use \`${prefix}help\` to see all commands.`,
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
              value: command.usage
                ? `\`${command.usage.replace("%p", prefix)}\``
                : `\`${prefix}${command.name}\``,
            },
            {
              name: "Aliases",
              value:
                Array.isArray(command.aliases) && command.aliases.length
                  ? command.aliases.map((a: string) => `\`${a}\``).join(", ")
                  : "None",
            },
          )
          .setColor(0x5865f2);

        return message.reply({ embeds: [embed] });
      }

      const categoriesData = await Promise.all<string>(
        prefixCommandsCategories.map(async (category: string) => {
          const categoryName = path.basename(category);
          const commandFiles = getAllFiles(category);
          const allCommands = await Promise.all(
            commandFiles.map(async (file: string) => {
              let rel = path.relative(__dirname, file).replace(/\\/g, "/");
              if (!rel.startsWith(".")) rel = "./" + rel;
              const cmd = (await import(rel)) as CommandModule;
              return cmd;
            }),
          );

          const commands = allCommands.filter(
            (cmd: CommandModule) => !cmd.default.devOnly,
          );

          const commandsInCategory = devs.includes(message.author.id)
            ? allCommands.map(
                (cmd: CommandModule) =>
                  `${cmd.default.devOnly ? "⧉" : cmd.default.premium ? "★" : "⌬"} \`${cmd.default.name}\` • ${cmd.default.description}`,
              )
            : commands.map(
                (cmd: CommandModule) =>
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
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Failed to load help")
            .setDescription(errorMessage)
            .setColor(0xd21872),
        ],
      });
    }
  },
};
