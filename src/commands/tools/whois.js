import { EmbedBuilder } from "discord.js";

export default {
  name: "whois",
  description: "Lookup domain WHOIS info",
  usage: "%pwhois <domain>",
  callback: async (client, message, args) => {
    const domain = args[0].replace(/^https?:\/\//, "");

    if (!domain) {
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

      const data = await res.json();

      const getEvent = (type) =>
        data.events?.find((e) => e.eventAction === type)?.eventDate;

      const creationDate = getEvent("registration");
      const expirationDate = getEvent("expiration");

      const embed = new EmbedBuilder()
        .setTitle(`✅ WHOIS Lookup`)
        .setDescription(`Domain: \`${domain}\``)
        .addFields(
          {
            name: "Registrar",
            value: data.entities?.[0]?.vcardArray?.[1]?.[1]?.[3] || "N/A",
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
              data.nameservers?.map((ns) => ns.ldhName).join("\n") || "N/A",
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
