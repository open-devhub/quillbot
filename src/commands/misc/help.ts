import { MessageFlags } from "discord.js";
import path, { join } from "path";
import { fileURLToPath } from "url";
import config from "../../../config.json" with { type: "json" };
import type {
  Command,
  CommandCallbackOpts,
  CommandModule,
} from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";
import getAllFiles from "../../utils/fs/getAllFiles.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  name: "help",
  description:
    "Provides information about available commands and how to use them.",
  usage: "help [command]",
  aliases: ["welp", "h"],
  async callback({ message, args }: CommandCallbackOpts) {
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
            flags: MessageFlags.IsComponentsV2,
            components: buildErrorComponent({
              title: "❌ Command Not Found",
              description: `No command named \`${args[0]}\` found. Use \`${prefix}help\` to see all commands.`,
            }),
          });
        }

        const aliases =
          Array.isArray(command.aliases) && command.aliases.length
            ? command.aliases.map((a: string) => `\`${a}\``).join(", ")
            : "None";

        const usage = command.usage
          ? `\`\`\`\n${prefix}${command.usage}\n\`\`\``
          : `\`${prefix}${command.name}\``;

        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildComponents([
            {
              type: "container",
              accentColor: 0x5865f2,
              components: [
                {
                  type: "text",
                  content: `### ${command.premium ? "★" : "⌬"} ${command.name}`,
                },
                { type: "text", content: command.description },
                { type: "separator", spacing: "small", divider: false },
                {
                  type: "text",
                  content: [
                    `**Usage**\n${usage}`,
                    `**Aliases**\n${aliases}`,
                  ].join("\n"),
                },
              ],
            },
          ]),
        });
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

      const helpText = `Usage: \`${prefixes[0]}command\`\n\n${categoriesData.join("\n\n")}`;

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x5865f2,
            components: [
              { type: "text", content: "### 📘 Commands Guide" },
              {
                type: "text",
                content: helpText.trim() || "No commands available.",
              },
              { type: "separator", spacing: "small" },
              {
                type: "text",
                content: `-# Requested by ${message.author.tag}`,
              },
            ],
          },
        ]),
      });
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Failed to Load Help",
          description: errorMessage,
        }),
      });
    }
  },
};
