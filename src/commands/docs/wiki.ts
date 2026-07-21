import { MessageFlags } from "discord.js";
import fetch from "node-fetch";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

async function getMetaDescription(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; QuillBot/1.0; +https://github.com/)",
      },
    });
    if (!res.ok) return "";

    const html = await res.text();

    const ogMatch =
      html.match(
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
      );

    const metaMatch =
      html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
      );

    const raw = (ogMatch?.[1] || metaMatch?.[1] || "").trim();
    if (!raw) return "";

    return raw
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

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
            title: "No Results Found",
            description: `¯\\_(ツ)_/¯ No MDN results found for **${query}**`,
          }),
        });
      }

      const doc = data.documents[0];
      const url = `https://developer.mozilla.org${doc.mdn_url}`;

      let description = await getMetaDescription(url);

      if (!description && doc.excerpt) {
        description = doc.excerpt.replace(/<[^>]+>/g, "").trim();
      }

      if (description.length > 500) {
        description = description.slice(0, 497) + "...";
      }

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
                content: description || "No description available.",
              },
              { type: "separator", spacing: "small" },
              {
                type: "section",
                components: [{ type: "text", content: "\u200b" }],
                accessory: {
                  type: "button",
                  style: "link",
                  label: "Open on MDN",
                  url,
                },
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
