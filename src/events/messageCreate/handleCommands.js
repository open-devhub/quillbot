import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import path, { join } from "path";
import { fileURLToPath } from "url";
import getAllFiles from "../../utils/getAllFiles.js";
import getConfig from "../../utils/getConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COOLDOWN_SECONDS = 3;
const USER_COOLDOWNS = new Map();

export default async (client, message) => {
  const { premiumServer, premiumServerInvite, devs } = await getConfig();
  if (!message || !message.guild || message.author?.bot) return;

  const now = Date.now();
  const expiry = USER_COOLDOWNS.get(message.author.id);
  if (expiry && expiry > now) {
    return;
  }

  try {
    const prefixes = [";"];
    const prefix = prefixes.find((p) => message.content.startsWith(p));
    if (!prefix) return;

    const expireAt = Date.now() + COOLDOWN_SECONDS * 1000;
    USER_COOLDOWNS.set(message.author.id, expireAt);
    setTimeout(
      () => USER_COOLDOWNS.delete(message.author.id),
      COOLDOWN_SECONDS * 1000,
    );

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const prefixCommandsPath = join(__dirname, "..", "..", "commands");

    const prefixCommandsCategories = getAllFiles(prefixCommandsPath, true);
    const commandPromises = [];

    for (const category of prefixCommandsCategories) {
      const commandFiles = getAllFiles(category);
      for (const file of commandFiles) {
        commandPromises.push(import(file));
      }
    }

    const prefixCommands = await Promise.all(commandPromises);

    const commandObject = prefixCommands.find((cmd) => {
      const command = cmd.default;
      if (!command || !command.name) return false;
      if (String(command.name).toLowerCase() === commandName) return true;
      if (Array.isArray(command.aliases)) {
        return command.aliases
          .map((a) => String(a).toLowerCase())
          .includes(commandName);
      }
      return false;
    })?.default;
    if (!commandObject) return;

    // if user is member of the premium server, use this command anywhere, if not, request to join

    const serverName = client.guilds.cache.get(premiumServer)?.name || "";
    if (commandObject.premium) {
      const member = await message.guild.members
        .fetch(message.author.id)
        .catch(() => null);
      if (!member) {
        const embed = new EmbedBuilder()
          .setTitle("💎 Premium Command")
          .setDescription(
            `This command is only available to members of the premium server${serverName ? ` (${serverName})` : ""}. Please join the server to use this command anywhere you want.`,
          )
          .setColor(0xff0000);

        const button = new ButtonBuilder()
          .setLabel("Join Premium Server")
          .setStyle(ButtonStyle.Link)
          .setURL(premiumServerInvite)
          .setEmoji("💎");
        const row = new ActionRowBuilder().addComponents(button);

        message.reply({ embeds: [embed], components: [row] });

        return;
      }
    }

    if (commandObject.devOnly) {
      if (!devs.includes(message.author.id)) {
        const embed = new EmbedBuilder()
          .setTitle("🔒 Developer Only Command")
          .setDescription(
            "This command is only available to the bot developers.",
          )
          .setColor(0xff0000);

        message.reply({ embeds: [embed] });
        return;
      }
    }

    if (commandObject.permissionsRequired?.length) {
      for (const permission of commandObject.permissionsRequired) {
        if (!message.member.permissions.has(permission)) {
          message.reply("Not enough permissions to run this command.");
          return;
        }
      }
    }
    await commandObject.callback(client, message, args);
  } catch (err) {
    console.error("Prefix Command Error:", err);
  }
};
