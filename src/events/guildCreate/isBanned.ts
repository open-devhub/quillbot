import type { Client, Guild } from "discord.js";
import { getDocument } from "../../utils/firestore.ts";

export default async (client: Client, guild: Guild) => {
  try {
    const banDoc = await getDocument("bannedGuilds", guild.id);

    if (banDoc) {
      await guild.leave().catch((err) => {
        console.error("Failed to leave banned guild:", err);
      });
    }
  } catch (err) {
    console.error("Error checking banned guild:", err);
  }
};
