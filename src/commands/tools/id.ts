import { MessageFlags } from "discord.js";
import ucid from "unique-custom-id";
import { map } from "unique-custom-id/format";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

export default {
  name: "id",
  description: "Generate a unique ID",
  usage: "id [format | list]",
  aliases: ["uuid", "uid"],
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      let format = args[0]?.toLowerCase() || "ucid";

      if (["formats", "list"].includes(format)) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildComponents([
            {
              type: "container",
              accentColor: 0x00ff00,
              components: [
                { type: "text", content: "### ✅ Available ID Formats" },
                {
                  type: "text",
                  content: Object.keys(map)
                    .map((f) => `\`${f}\``)
                    .join(", "),
                },
              ],
            },
          ]),
        });
      }

      if (
        !args[0] ||
        !Object.keys(map).includes(args[0].toLowerCase()) ||
        !format
      ) {
        format = "uuid";
      }

      const id = ucid.format(format);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x00ff00,
            components: [
              { type: "text", content: "### ✅ Generated Unique ID" },
              {
                type: "text",
                content: `\`\`\`\n${id}\n\`\`\``,
              },
              { type: "separator", spacing: "small" },
              {
                type: "text",
                content: `-# Format: \`${format}\``,
              },
            ],
          },
        ]),
      });
    } catch (err) {
      console.error(err);
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ Failed to Generate ID",
          description: "An error occurred while generating the unique ID.",
        }),
      });
    }
  },
};
