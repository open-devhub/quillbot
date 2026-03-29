import path, { join } from "path";
import { fileURLToPath } from "url";
import getAllFiles from "./getAllFiles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (exceptions = []) => {
  let localCommands = [];

  const commandCategories = await getAllFiles(
    join(__dirname, "..", "commands"),
    true,
  );

  for (const commandCategory of commandCategories) {
    const commandFiles = getAllFiles(commandCategory);

    for (const commandFile of commandFiles) {
      const commandObject = await import(commandFile);

      if (exceptions.includes(commandObject.name)) {
        continue;
      }

      localCommands.push(commandObject);
    }
  }

  return localCommands;
};
