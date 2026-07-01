import type { SubcommandCallbackOpts } from "../../types/command.ts";
import { cacheDB, getCachedDB } from "../../utils/cacheDB.ts";
import { createDocument, deleteDocument } from "../../utils/firestore.ts";

export default {
  name: "premium",
  description: "Make/remove a server premium",
  devOnly: true,

  callback: {
    async add({ message, args }: SubcommandCallbackOpts) {
      try {
        const guildId = args[0] || message.guild?.id;
        if (!guildId) return message.reply("Provide a guild ID.");

        const cachedDB = await getCachedDB();
        if (!cachedDB?.premiumServers) cachedDB.premiumServers = {};

        if (cachedDB.premiumServers[guildId]) {
          return message.reply("This server is already premium.");
        }

        await createDocument("premiumServers", guildId, {
          addedAt: new Date().toLocaleString(),
          mod: message.author.id,
        });
        await cacheDB();

        return message.reply(`Server ${guildId} has been added to premium.`);
      } catch (err) {
        console.error("Error adding premium server:", err);
        return message.reply(
          "An error occurred while adding the premium server.",
        );
      }
    },

    async remove({ message, args }: SubcommandCallbackOpts) {
      try {
        const guildId = args[0] || message.guild?.id;
        if (!guildId) return message.reply("Provide a guild ID.");

        const cachedDB = await getCachedDB();
        if (!cachedDB?.premiumServers) cachedDB.premiumServers = {};

        if (!cachedDB.premiumServers[guildId]) {
          return message.reply("This server is not premium.");
        }

        await deleteDocument("premiumServers", guildId);
        await cacheDB();

        return message.reply(
          `Server ${guildId} has been removed from premium.`,
        );
      } catch (err) {
        console.error("Error removing premium server:", err);
        return message.reply(
          "An error occurred while removing the premium server.",
        );
      }
    },
  },
};
