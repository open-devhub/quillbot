import { MessageFlags, type Client, type Message } from "discord.js";
import pkg from "../../../package.json" with { type: "json" };
import { buildComponents } from "../../utils/components/buildComponents.ts";

export default async (client: Client, message: Message) => {
  if (
    message.mentions.users.size !== 1 ||
    !message.mentions.has(client.user!) ||
    (message.content.trim() !== `<@${client.user!.id}>` &&
      message.content.trim() !== `<@!${client.user!.id}>`)
  ) {
    return;
  }

  const uptimeMs = process.uptime() * 1000;

  const days = Math.floor(uptimeMs / 86400000);
  const hours = Math.floor((uptimeMs % 86400000) / 3600000);
  const minutes = Math.floor((uptimeMs % 3600000) / 60000);

  const uptime =
    days > 0
      ? `${days}d ${hours}h ${minutes}m`
      : hours > 0
        ? `${hours}h ${minutes}m`
        : `${minutes}m`;

  const guilds = client.guilds.cache.size;
  const users = client.guilds.cache.reduce(
    (n, g) => n + (g.memberCount || 0),
    0,
  );

  return message.reply({
    flags: MessageFlags.IsComponentsV2,
    components: buildComponents([
      {
        type: "container",
        accentColor: 0x5865f2,
        components: [
          {
            type: "section",
            components: [
              {
                type: "text",
                content: [
                  `## ${client.user!.displayName}`,
                  "",
                  pkg.description,
                  "",
                  "-# Use `;help` to see everything I can do.",
                ].join("\n"),
              },
            ],
            accessory: {
              type: "thumbnail",
              url: client.user!.displayAvatarURL({
                extension: "png",
                size: 512,
              }),
            },
          },

          {
            type: "separator",
            spacing: "small",
          },

          {
            type: "text",
            content: [
              "### Features",
              "",
              "⌬ AI-powered code assistance",
              "⌬ Sandboxed code execution (60+ languages)",
              "⌬ Programming language detection",
              "⌬ Code formatting with Prettier",
              "⌬ Documentation search (MDN, Wikipedia, man, etc)",
              "⌬ Package registry search (npm, PyPI, crates.io, RubyGems, etc)",
              "⌬ GitHub repository & profile utilities",
              "⌬ URL safety scanning & HTTP inspection",
              "⌬ Developer utilities (Color preview, Regex, Base64, IDs, WHOIS, Snowflakes, etc)",
              "",
              "-# Type in `;changelog` to see the latest changes!",
            ].join("\n"),
          },

          {
            type: "separator",
            spacing: "small",
          },

          {
            type: "mediaGallery",
            items: [
              {
                url: "https://raw.githubusercontent.com/open-devhub/quillbot/refs/heads/main/assets/banner2.png",
              },
            ],
          },

          {
            type: "separator",
            spacing: "small",
          },

          {
            type: "text",
            content: `-# ${[
              `Quill v${pkg.version}`,
              `Latency: ${Math.round(client.ws.ping)}ms`,
              `Guilds: ${guilds.toLocaleString()}`,
              `Users: ${users.toLocaleString()}`,
            ]
              .map((i) => `**\` ${i} \`**`)
              .join(" ┊ ")}`,
          },

          {
            type: "separator",
            spacing: "small",
          },

          {
            type: "actionRow",
            components: [
              {
                type: "button",
                style: "link",
                label: "★ Add to Server",
                url: "https://discord.com/oauth2/authorize?client_id=1447982776740610058",
              },
              {
                type: "button",
                style: "link",
                label: "★ GitHub Repo",
                url: "https://github.com/open-devhub/quillbot",
              },
              {
                type: "button",
                style: "link",
                label: "★ Discord",
                url: "https://discord.gg/MuZFAeVHgp",
              },
            ],
          },
        ],
      },
    ]),
  });
};
