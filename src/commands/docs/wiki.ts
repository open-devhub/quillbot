import { MessageFlags } from "discord.js";
import fetch from "node-fetch";
import type { CommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

export default {
  name: "wiki",
  description: "Search Wikipedia articles",
  usage: "wiki <term>",
  aliases: ["wikipedia", "wikisearch"],

  async callback({ message, args }: CommandCallbackOpts) {
    try {
      const query = args.join(" ");

      if (!query) {
        return message.reply({
          components: buildErrorComponent({
            title: "Missing search term",
            description:
              "Please provide a search term, e.g. `++wiki JavaScript`",
          }),
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const controller1 = new AbortController();
      const timeoutId1 = setTimeout(() => controller1.abort(), 10000);

      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          query,
        )}&utf8=&format=json`,
      );

      clearTimeout(timeoutId1);

      const data = await res.json();

      if (!data.query || !data.query.search || data.query.search.length === 0) {
        return message.reply({
          components: buildErrorComponent({
            title: "No Wikipedia results found",
            description: `No articles were found for **${query}**`,
          }),
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const article = data.query.search[0];
      const title = article.title;
      const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;

      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 10000);

      const pageRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=300&format=json&titles=${encodeURIComponent(title)}`,
      );

      clearTimeout(timeoutId2);

      const pageData = await pageRes.json();

      const page = Object.values(pageData.query.pages)[0] as {
        extract?: string;
        thumbnail?: {
          source?: string;
        };
      };

      const extract = page?.extract ?? "No extract available.";
      const thumbnail = page?.thumbnail?.source;

      const components = buildComponents([
        {
          type: "container",
          accentColor: "#ffffff",
          components: [
            {
              type: "section",
              components: [
                {
                  type: "text",
                  content: `### ${title}\n`,
                },
                {
                  type: "text",
                  content:
                    extract.length > 800
                      ? extract.slice(0, extract.lastIndexOf(" ", 800)) + " ..."
                      : extract,
                },
              ],
              ...(thumbnail
                ? {
                    accessory: {
                      type: "thumbnail",
                      url: thumbnail,
                      description: title,
                    },
                  }
                : {
                    accessory: {
                      type: "button",
                      style: "link",
                      label: "Read on Wikipedia",
                      url,
                    },
                  }),
            },

            {
              type: "separator",
            },

            {
              type: "actionRow",
              components: [
                {
                  type: "button",
                  style: "link",
                  label: "Read on Wikipedia",
                  url,
                },
              ],
            },

            {
              type: "text",
              content: "-# Source: wikipedia.org",
            },
          ],
        },
      ]);

      return message.reply({
        components,
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (err: unknown) {
      const error = err as {
        name?: string;
        code?: string;
      };

      if (error.name === "AbortError" || error.code === "ETIMEDOUT") {
        return message.reply({
          components: buildErrorComponent({
            title: "Wikipedia request timed out",
            description:
              "The request to Wikipedia took too long and was aborted.",
          }),
          flags: ["IsComponentsV2"],
        });
      }

      console.error(err);

      return message.reply({
        components: buildErrorComponent({
          title: "Failed to fetch Wikipedia results",
          description:
            "An error occurred while fetching results from Wikipedia.",
        }),
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
