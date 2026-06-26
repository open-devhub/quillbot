import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Message, // Fixed: Import Message from discord.js instead of firebase-admin
  PermissionsBitField,
} from "discord.js";
import "dotenv/config";
import NodeCache from "node-cache";
import path, { join } from "path";
import { fileURLToPath } from "url";
import { getCachedDB } from "../../utils/cacheDB.ts";
import getAllFiles from "../../utils/getAllFiles.ts";
import getConfig from "../../utils/getConfig.ts";
import { trackCommandStat } from "../../utils/stats.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COOLDOWN_SECONDS = 5;
const MAX_COMMANDS = 3;

interface CooldownData {
  count: number;
}

// Define the shape of your command objects
interface CommandObject {
  name: string;
  description?: string;
  usage?: string;
  aliases?: string[];
  devOnly?: boolean;
  premium?: boolean;
  permissionsRequired?: bigint[]; // discord.js permissions use bigints
  react?: string;
  callback: Function | Record<string, Function>;
}

const cooldownCache = new NodeCache({
  stdTTL: COOLDOWN_SECONDS,
  checkperiod: 900, // 15 minutes
});

const prefixCommandsPath = join(__dirname, "..", "..", "commands");
const prefixCommandsCategories = getAllFiles(prefixCommandsPath, true);

// Fixed: Add explicit type to the cached commands array
let cachedCommands: CommandObject[] = [];

async function loadCommands() {
  const commandPromises = [];

  for (const category of prefixCommandsCategories) {
    const commandFiles = getAllFiles(category);
    for (const file of commandFiles) {
      commandPromises.push(import(file));
    }
  }

  const imported = await Promise.all(commandPromises);
  cachedCommands = imported.map((cmd) => cmd.default).filter(Boolean);
}

// load at startup
await loadCommands();

export default async (client: Client, message: Message) => {
  const { premiumServer, premiumServerInvite, devs, prefixes } =
    await getConfig();

  if (
    process.env.NODE_ENV?.toLowerCase() === "dev" &&
    !devs.includes(message.author.id)
  )
    return;

  // Fixed: Added message.guild baseline check before accessing guildId or member properties safely
  if (!message || !message.guild || message.author?.bot) return;

  const userId = message.author.id;

  // Keep track of command structure across try/catch scope
  let commandObject: CommandObject | undefined;
  let commandName = "";

  try {
    const prefix = prefixes.find((p: string) => message.content.startsWith(p));
    if (!prefix) return;

    // Fixed: Explicit type casting for Cache retrieval
    let userData = cooldownCache.get<CooldownData>(userId);

    if (!userData) {
      userData = { count: 0 };
    }

    userData.count += 1;

    if (userData.count > MAX_COMMANDS) {
      return message.reply(
        "Woah, slow down! You've used too many commands too quickly.",
      );
    }

    cooldownCache.set(userId, userData);

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const firstArg = args.shift();
    if (!firstArg) return;

    commandName = firstArg.toLowerCase();

    commandObject = cachedCommands.find((command) => {
      if (!command?.name) return false;

      if (command.name.toLowerCase() === commandName) return true;

      if (Array.isArray(command.aliases)) {
        return command.aliases
          .map((a: string) => a.toLowerCase())
          .includes(commandName);
      }

      return false;
    });

    if (!commandObject) return;

    const serverName = client.guilds.cache.get(premiumServer)?.name || "";

    if (commandObject.devOnly && !devs.includes(userId)) return;
    if (commandObject.premium) {
      const premiumGuild = client.guilds.cache.get(premiumServer);

      const member = premiumGuild
        ? await premiumGuild.members.fetch(userId).catch(() => null)
        : null;

      const db = await getCachedDB();
      const guildId = message.guildId;
      const isPremiumServer = guildId
        ? db?.premiumServers?.[guildId]
        : undefined;

      if (!member && !isPremiumServer) {
        const embed = new EmbedBuilder()
          .setTitle("💎 Premium Command")
          .setDescription(
            `This command is only available to members of ${
              serverName || "the premium"
            } server. Join the server to access this command anywhere, and support the bot development!`,
          )
          .setColor(0xff0000);

        const button = new ButtonBuilder()
          .setLabel(`Join ${serverName || "Premium Server"}`)
          .setStyle(ButtonStyle.Link)
          .setURL(premiumServerInvite)
          .setEmoji("💎");

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

        return message.reply({ embeds: [embed], components: [row] });
      }
    }

    if (commandObject.permissionsRequired?.length) {
      // Fixed: Typings ensured message.member exists and permissions are valid
      if (!message.member) return;

      for (const permission of commandObject.permissionsRequired) {
        if (!message.member.permissions.has(permission)) {
          return message.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ Missing Permissions")
                .setDescription(
                  `You need the following permissions to use this command:\n${commandObject.permissionsRequired
                    .map(
                      (p) =>
                        `- \`${new PermissionsBitField(p).toArray().join("")}\``,
                    )
                    .join("\n")}`,
                ),
            ],
          });
        }
      }
    }

    if (commandObject.react) {
      await message.react(commandObject.react).catch(() => null);
    }

    if (typeof commandObject.callback === "function") {
      await commandObject.callback({ client, message, args });
    } else if (
      typeof commandObject.callback === "object" &&
      commandObject.callback !== null
    ) {
      const subCommandName = args.shift()?.toLowerCase();
      // Fixed: Safe property accessing mapping over string keys
      const subCommand = subCommandName
        ? (commandObject.callback as Record<string, Function>)[subCommandName]
        : undefined;

      if (subCommand && typeof subCommand === "function") {
        await subCommand({ client, message, args });
      } else {
        return message.reply({
          embeds: [
            new EmbedBuilder().setTitle("📘 Usage").setDescription(
              `\`${prefix}${commandObject.name} <subcommand>\`\n\nAvailable subcommands:\n${Object.keys(
                commandObject.callback,
              )
                .map((sc) => `- \`${sc}\``)
                .join("\n")}`,
            ),
          ],
        });
      }
    } else {
      console.error(
        `Invalid command configuration for command: ${commandObject.name}`,
      );
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Invalid Command")
            .setDescription("An error occurred while processing that command.")
            .setColor(0xd21872),
        ],
      });
    }

    // Track command statistics
    await trackCommandStat(
      commandObject.name,
      message.guildId ?? "",
      commandObject.devOnly || false,
      client,
    );
  } catch (err) {
    const cmdName = commandObject?.name || commandName || "unknown";

    console.error(`Error executing ${cmdName} command: ${err}`);

    try {
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Command Error")
        .setDescription("An error occurred while running that command.")
        .setColor(0xff0000);

      await message.reply({ embeds: [errorEmbed] });
    } catch (replyErr) {
      console.error(
        `Failed to send error reply for ${cmdName} command: ${replyErr}`,
      );
    }
  }
};
