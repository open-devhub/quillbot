import type { Client } from "discord.js";
import { cacheDB } from "../../utils/cacheDB.js";

export default async (client: Client) => {
  await cacheDB();
};
