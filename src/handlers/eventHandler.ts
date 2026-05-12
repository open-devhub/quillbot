import path from "path";
import { fileURLToPath } from "url";
import getAllFiles from "../utils/getAllFiles.js";
import { Client } from "discord.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default (client: Client) => {
  const eventFolders = getAllFiles(path.join(__dirname, "..", "events"), true);

  for (const eventFolder of eventFolders) {
    let eventFiles = getAllFiles(eventFolder);
    eventFiles.sort();

    const eventName = eventFolder.replace(/\\/g, "/").split("/").pop();

    if (!eventName) continue;

    client.on(eventName, async (arg) => {
      for (const eventFile of eventFiles) {
        const eventFunction = await import(eventFile);
        await eventFunction.default(client, arg);
      }
    });
  }
};
