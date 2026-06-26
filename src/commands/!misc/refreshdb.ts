import type { Client, Message } from "discord.js";
import { cacheDB } from "../../utils/cacheDB.js";

export default {
  name: "refreshdb",
  description: "Refresh the database cache",
  aliases: ["refreshcache"],
  devOnly: true,

  async callback(client: Client, message: Message, args: string[]) {
    try {
      await cacheDB();
      return message.reply("Database cache has been refreshed.");
    } catch (err) {
      console.error("Error refreshing database cache:", err);
      return message.reply(
        "An error occurred while refreshing the database cache.",
      );
    }
  },
};
