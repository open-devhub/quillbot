import areCommandsDifferent from "../../utils/areCommandsDifferent.js";
import getApplicationCommands from "../../utils/getApplicationCommands.js";
import getConfig from "../../utils/getConfig.js";
import getLocalCommands from "../../utils/getLocalCommands.js";

export default async (client) => {
  try {
    const { guildId } = getConfig();
    const localCommands = await getLocalCommands();
    const applicationCommands = await getApplicationCommands(client, guildId);
    console.log(localCommands);

    for (const localCommandModule of localCommands) {
      const localCommand = localCommandModule.default;
      const { name, description, options } = localCommand;

      const existingCommand = await applicationCommands.cache.find(
        (cmd) => cmd.name === name,
      );

      if (existingCommand) {
        if (localCommand.deleted) {
          await applicationCommands.delete(existingCommand.id);
          console.log(`🗑 Deleted command "${name}".`);
          continue;
        }

        if (areCommandsDifferent(existingCommand, localCommand)) {
          await applicationCommands.edit(existingCommand.id, {
            description,
            options,
          });

          console.log(`🔁 Edited command "${name}".`);
        }
      } else {
        if (localCommand.deleted) {
          console.log(
            `⏩ Skipping registering command "${name}" as it's set to delete.`,
          );
          continue;
        }

        await applicationCommands.create({
          name,
          description,
          options,
        });

        console.log(`👍 Registered command "${name}."`);
      }
    }
  } catch (error) {
    console.log(`There was an error: ${error}`);
    console.dir(error, { depth: null });
  }
};
