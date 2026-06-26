import type { Client } from "discord.js";
import { cacheDB } from "../../utils/cacheDB.ts";

export default async (client: Client) => {
  await cacheDB();
};
