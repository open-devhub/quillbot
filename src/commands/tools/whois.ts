import { EmbedBuilder } from "discord.js";
import type { CommandCallbackOpts } from "../../types/command.ts";

type WhoisEvent = {
  eventAction?: string;
  eventDate?: string;
};

type WhoisData = {
  events?: WhoisEvent[];
  entities?: Array<{ vcardArray?: unknown[][] }>;
  nameservers?: Array<{ ldhName?: string }>;
};

export default {
  name: "whois",
  description: "Lookup domain WHOIS info",
  usage: "%pwhois <domain>",
  async callback({ client, message, args }: CommandCallbackOpts) {
    const rawDomain = args[0];
    if (!rawDomain) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ No domain provided")
            .setDescription(
              "Please provide a domain to lookup.\nExample: `;whois example.com`",
            )
            .setColor(0xd21872),
        ],
      });
    }

    const domain = rawDomain.replace(/^https?:\/\//, "");

    try {
      const res = await fetch(`https://rdap.org/domain/${domain}`);
      if (!res.ok) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Invalid Domain")
              .setDescription("Please provide a valid domain to lookup.")
              .setColor(0xd21872),
          ],
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

      const embed = new EmbedBuilder()
        .setTitle(`✅ WHOIS Lookup`)
        .setDescription(`Domain: \`${domain}\``)
        .addFields(
          {
            name: "Registrar",
            value: registrar || "N/A",
            inline: true,
          },
          {
            name: "Creation Date",
            value: creationDate
              ? `<t:${Math.floor(new Date(creationDate).getTime() / 1000)}:D>`
              : "N/A",
            inline: true,
          },
          {
            name: "Expiration Date",
            value: expirationDate
              ? `<t:${Math.floor(new Date(expirationDate).getTime() / 1000)}:D>`
              : "N/A",
            inline: true,
          },
          {
            name: "Name Servers",
            value:
              data.nameservers
                ?.map((ns) => ns.ldhName ?? "")
                .filter((ns): ns is string => ns.length > 0)
                .join("\n") || "N/A",
          },
        )
        .setColor(0x22c55e);

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Failed to fetch WHOIS info")
            .setDescription(
              "An error occurred while fetching the WHOIS information.",
            )
            .setColor(0xd21872),
        ],
      });
    }
  },
};
