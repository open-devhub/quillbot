import { EmbedBuilder } from "discord.js";
import config from "../../config.json" with { type: "json" };
import { client } from "../index.ts";
import type { Log } from "../types/log.ts";

export function log(entry: Log) {
  const { logs } = config;

  const logsChannel = client.channels.cache.get(logs);

  if (!logsChannel || !("send" in logsChannel)) {
    console.error("Logs channel not found or not sendable.");
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(entry.title)
    .setDescription(entry.description)
    .setColor(entry.color || 0x2ecc71);

  entry.fields && embed.addFields(entry.fields);
  entry.timestamp && embed.setTimestamp();
  entry.footer && embed.setFooter(entry.footer);
  entry.thumbnail && embed.setThumbnail(entry.thumbnail);
  entry.author && embed.setAuthor(entry.author);
  entry.image && embed.setImage(entry.image);

  logsChannel.send({ embeds: [embed] }).catch((err) => {
    console.error("Failed to send log message:", err);
  });
}
