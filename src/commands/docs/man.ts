import { MessageFlags } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";
import { man } from "../../utils/misc/man.ts";

export default {
  name: "man",
  description: "Search man pages",
  aliases: ["manual"],
  usage: "man <term>",
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      const term = args.join(" ");
      if (!term) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Missing Term!",
            description:
              "Please provide a term to search for in the man pages.",
          }),
        });
      }

      const page = await man(term);
      if (!page) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "Man Page Not Found",
            description: `No man page found for the term \`${term}\`.`,
          }),
        });
      }

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x7289da,
            components: [
              { type: "text", content: `### ${page.title}` },
              {
                type: "text",
                content: page.description || "No description available.",
              },
              { type: "separator", spacing: "small" },

              {
                type: "actionRow",
                components: [
                  {
                    type: "button",
                    style: "link",
                    label: "Open Man Page",
                    url: page.url,
                  },
                ],
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
          title: "❌ Failed to Fetch Man Page",
          description: "An unexpected error occurred.",
        }),
      });
    }
  },
};
