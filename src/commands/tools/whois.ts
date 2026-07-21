import { MessageFlags } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";
import type { WhoisData } from "../../types/whois.ts";

import { buildComponents } from "../../utils/components/buildComponents.ts";
import { buildErrorComponent } from "../../utils/components/buildError.ts";

export default {
  name: "whois",
  description: "Lookup domain WHOIS info",
  usage: "whois <domain>",

  async callback({ message, args }: CommandCallbackOpts) {
    const rawDomain = args[0];

    if (!rawDomain) {
      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildErrorComponent({
          title: "❌ No Domain Provided",
          description:
            "Please provide a domain to lookup.\nExample: `;whois example.com`",
        }),
      });
    }

    const domain = rawDomain.replace(/^https?:\/\//, "");

    try {
      const res = await fetch(`https://rdap.org/domain/${domain}`);

      if (!res.ok) {
        return message.reply({
          flags: MessageFlags.IsComponentsV2,
          components: buildErrorComponent({
            title: "❌ Invalid Domain",
            description: "Please provide a valid domain to lookup.",
          }),
        });
      }

      const data = (await res.json()) as WhoisData;

      const getEvent = (type: string): string | undefined =>
        data.events?.find((e) => e.eventAction === type)?.eventDate;

      const creationDate = getEvent("registration");
      const expirationDate = getEvent("expiration");

      const registrar =
        Array.isArray(data.entities?.[0]?.vcardArray) &&
        Array.isArray(data.entities?.[0].vcardArray[1]) &&
        Array.isArray(data.entities?.[0].vcardArray[1][1])
          ? (data.entities![0].vcardArray[1][1][3] as string | undefined)
          : undefined;

      const nameServers =
        data.nameservers
          ?.map((ns) => ns.ldhName ?? "")
          .filter((ns): ns is string => ns.length > 0)
          .join("\n") || "N/A";

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: buildComponents([
          {
            type: "container",
            accentColor: 0x22c55e,
            components: [
              {
                type: "text",
                content: "### 🌐 WHOIS Lookup",
              },
              {
                type: "text",
                content: `Domain: \`${domain}\``,
              },
              {
                type: "separator",
                spacing: "small",
              },
              {
                type: "text",
                content: [
                  `**Registrar**: ${registrar || "N/A"}`,
                  `**Creation Date**: ${
                    creationDate
                      ? `<t:${Math.floor(new Date(creationDate).getTime() / 1000)}:D>`
                      : "N/A"
                  }`,
                  `**Expiration Date**: ${
                    expirationDate
                      ? `<t:${Math.floor(new Date(expirationDate).getTime() / 1000)}:D>`
                      : "N/A"
                  }`,
                  `**Name Servers**:\n${nameServers}`,
                ].join("\n"),
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
          title: "❌ Failed to Fetch WHOIS Info",
          description:
            "An error occurred while fetching the WHOIS information.",
        }),
      });
    }
  },
};
