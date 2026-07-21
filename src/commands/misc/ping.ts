import { MessageFlags } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default {
  name: "ping",
  description: "Check the bot's latency and websocket ping",
  async callback({ client, message }: CommandCallbackOpts) {
    try {
      const sent = await message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x5865f2,
            components: [{ type: "text", content: "### 🏓 Pinging..." }],
          },
        ]),
      });

      const roundtrip = sent.createdTimestamp - message.createdTimestamp;
      const wsPing = client.ws.ping;
      const uptime = formatUptime(client.uptime ?? 0);
      const memory = formatBytes(process.memoryUsage().heapUsed);
      const guilds = client.guilds.cache.size;
      const users = client.guilds.cache.reduce(
        (acc, g) => acc + (g.memberCount || 0),
        0,
      );

      const latencyColor =
        roundtrip < 150 ? 0x22c55e : roundtrip < 300 ? 0xeab308 : 0xef4444;

      await sent.edit({
        components: buildComponents([
          {
            type: "container",
            accentColor: latencyColor,
            components: [
              { type: "text", content: "### 🏓 Pong!" },
              {
                type: "text",
                content: [
                  `**Roundtrip**: \`${roundtrip}ms\``,
                  `**WebSocket**: \`${wsPing}ms\``,
                  `**Uptime**: \`${uptime}\``,
                  `**Memory**: \`${memory}\``,
                  `**Guilds**: \`${guilds}\``,
                  `**Users**: \`${users.toLocaleString()}\``,
                ].join("\n"),
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
    } catch (err) {
      console.error(err);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Ping Failed",
          description: "Could not measure latency.",
        }),
      });
    }
  },
};
