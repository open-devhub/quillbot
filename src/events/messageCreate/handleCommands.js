import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import NodeCache from "node-cache";
import path, { join } from "path";
import { fileURLToPath } from "url";
import getAllFiles from "../../utils/getAllFiles.js";
import getConfig from "../../utils/getConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COOLDOWN_SECONDS = 5;
const MAX_COMMANDS = 3;

const cooldownCache = new NodeCache({
  stdTTL: COOLDOWN_SECONDS,
  checkperiod: 900, // 15 minutes
});

const prefixCommandsPath = join(__dirname, "..", "..", "commands");
const prefixCommandsCategories = getAllFiles(prefixCommandsPath, true);

let cachedCommands = [];

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

export default async (client, message) => {
  const { premiumServer, premiumServerInvite, devs, prefixes } =
    await getConfig();

  if (!message || !message.guild || message.author?.bot) return;

  const userId = message.author.id;

  let userData = cooldownCache.get(userId);

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

  try {
    const prefix = prefixes.find((p) => message.content.startsWith(p));
    if (!prefix) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    const commandObject = cachedCommands.find((command) => {
      if (!command?.name) return false;

      if (command.name.toLowerCase() === commandName) return true;

      if (Array.isArray(command.aliases)) {
        return command.aliases
          .map((a) => a.toLowerCase())
          .includes(commandName);
      }

      return false;
    });

    if (!commandObject) return;

    const serverName = client.guilds.cache.get(premiumServer)?.name || "";

    if (commandObject.premium) {
      const premiumGuild = client.guilds.cache.get(premiumServer);

      const member = premiumGuild
        ? await premiumGuild.members.fetch(userId).catch(() => null)
        : null;

      if (!member) {
        const embed = new EmbedBuilder()
          .setTitle("💎 Premium Command")
          .setDescription(
            `This command is only available to members of the premium server${
              serverName ? ` (${serverName})` : ""
            }.`,
          )
          .setColor(0xff0000);

        const button = new ButtonBuilder()
          .setLabel(`Join ${serverName || "Premium Server"}`)
          .setStyle(ButtonStyle.Link)
          .setURL(premiumServerInvite)
          .setEmoji("💎");

        const row = new ActionRowBuilder().addComponents(button);

        return message.reply({ embeds: [embed], components: [row] });
      }
    }

    if (commandObject.devOnly) {
      if (!devs.includes(userId)) {
        const embed = new EmbedBuilder()
          .setTitle("🔒 Developer Only Command")
          .setDescription(
            "This command is only available to the bot developers.",
          )
          .setColor(0xff0000);

        return message.reply({ embeds: [embed] });
      }
    }

    if (commandObject.permissionsRequired?.length) {
      for (const permission of commandObject.permissionsRequired) {
        if (!message.member.permissions.has(permission)) {
          return message.reply("Not enough permissions to run this command.");
        }
      }
    }

    if (commandObject.react) {
      await message.react(commandObject.react).catch(() => null);
    }

    await commandObject.callback(client, message, args);
  } catch (err) {
    console.error("Prefix Command Error:", err);

    try {
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Command Error")
        .setDescription("An error occurred while running that command.")
        .setColor(0xff0000);

      await message.reply({ embeds: [errorEmbed] });
    } catch (replyErr) {
      console.error("Failed to send error reply:", replyErr);
    }
  }
};
