import { Client, EmbedBuilder, type Interaction } from "discord.js";
import "dotenv/config";
import path, { join } from "path";
import { fileURLToPath } from "url";
import config from "../../../config.json" with { type: "json" };
import getAllFiles from "../../utils/fs/getAllFiles.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface InteractionObject {
  id: string;
  callback: Function;
}

const interactionsPath = join(__dirname, "..", "..", "interactions");

let cachedInteractions: InteractionObject[] = [];

async function loadInteractions() {
  const interactionFiles = getAllFiles(interactionsPath);
  const interactionPromises: Promise<any>[] = [];

  for (const file of interactionFiles) {
    interactionPromises.push(import(file));
  }

  const imported = await Promise.all(interactionPromises);
  cachedInteractions = imported.map((intObj) => intObj.default).filter(Boolean);
}

// load at startup
await loadInteractions();

export default async (client: Client, interaction: Interaction) => {
  const { devs } = config;

  if (
    process.env.NODE_ENV?.toLowerCase() === "dev" &&
    !devs.includes(interaction.user.id)
  )
    return;

  if (!interaction || interaction.user?.bot) return;

  // Keep track of interaction id across try/catch scope
  let interactionObject: InteractionObject | undefined;
  let interactionId = "";

  try {
    // Determine identifier: commandName for slash/context/autocomplete, customId for components/modals
    if (
      interaction.isChatInputCommand() ||
      interaction.isContextMenuCommand() ||
      interaction.isAutocomplete()
    ) {
      interactionId = interaction.commandName;
    } else if (
      interaction.isButton() ||
      interaction.isStringSelectMenu() ||
      interaction.isUserSelectMenu() ||
      interaction.isRoleSelectMenu() ||
      interaction.isMentionableSelectMenu() ||
      interaction.isModalSubmit()
    ) {
      interactionId = interaction.customId;
    }

    if (!interactionId) return;

    interactionObject = cachedInteractions.find((intObj) => {
      if (!intObj?.id) return false;
      return intObj.id === interactionId;
    });

    if (!interactionObject) return;

    if (typeof interactionObject.callback === "function") {
      await interactionObject.callback({ client, interaction });
    } else {
      console.error(
        `Invalid interaction configuration for id: ${interactionObject.id}`,
      );
      return;
    }
  } catch (err) {
    const intId = interactionObject?.id || interactionId || "unknown";

    console.error(`Error executing ${intId} interaction: ${err}`);

    try {
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Interaction Error")
        .setDescription("An error occurred while running that interaction.")
        .setColor(0xff0000);

      if ((interaction as any).replied || (interaction as any).deferred) {
        await (interaction as any)
          .followUp({ embeds: [errorEmbed], ephemeral: true })
          .catch((followUpErr: Error) => {
            console.error(
              `Failed to send followUp error message for ${intId}:`,
              followUpErr,
            );
          });
      } else {
        await (interaction as any)
          .reply({ embeds: [errorEmbed], ephemeral: true })
          .catch((replyErr: Error) => {
            console.error(
              `Failed to send reply error message for ${intId}:`,
              replyErr,
            );
          });
      }
    } catch (replyErr) {
      console.error(
        `Failed to send error reply for ${intId} interaction: ${replyErr}`,
      );
    }
  }
};
