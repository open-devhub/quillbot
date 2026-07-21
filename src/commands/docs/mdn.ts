import { MessageFlags } from "discord.js";
import fetch from "node-fetch";
import TurndownService from "turndown";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

const turndown = new TurndownService();

export default {
  name: "mdn",
  description: "Search MDN Web Docs",
  aliases: ["mozilla", "mdnsearch"],
  usage: "mdn <term>",
  async callback({ message, args }: CommandCallbackOpts) {
    try {
      const query = args.join(" ");
      if (!query) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Missing Search Term",
            description: "Please provide a search term, e.g. `;mdn WeakMap`",
          }),
        });
      }

      const res = await fetch(
        `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`,
      );
      const data = await res.json();

      if (!data.documents || data.documents.length === 0) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "No results found",
            description: `¯\\_(ツ)_/¯ No MDN results found for **${query}**`,
          }),
        });
      }

      const doc = data.documents[0];
      const rawExcerpt = doc.excerpt || "";
      const markdownExcerpt = rawExcerpt ? turndown.turndown(rawExcerpt) : "";
      const url = `https://developer.mozilla.org${doc.mdn_url}`;

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x83d0f2,
            components: [
              { type: "text", content: `### ${doc.title}` },
              {
                type: "text",
                content: markdownExcerpt || "No excerpt available.",
              },
              { type: "separator" },
              {
                type: "actionRow",
                components: [
                  {
                    type: "button",
                    style: "link",
                    label: "Open on MDN",
                    url,
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
          title: "❌ Failed to Fetch MDN Results",
          description:
            "An error occurred while fetching results from MDN Web Docs.",
        }),
      });
    }
  },
};
