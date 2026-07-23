import { EmbedBuilder } from "discord.js";
import type { SubcommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "contributors",
  description: "List the people who contributed to the quillbot repository",
  aliases: ["team", "collaborators"],
  async callback({ message }: SubcommandCallbackOpts) {
    // list contributors from GitHub API
    const contributors = await fetch(
      "https://api.github.com/repos/open-devhub/quillbot/contributors",
    )
      .then((res) => res.json())
      .then((data) =>
        data.map((contributor: { login: string }) => contributor.login),
      )
      .catch(() => "Unable to fetch contributors");

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("💻 GitHub Contributors")
          .setDescription(
            contributors
              .slice(0, 30)
              .map((c: string) => `- [@${c}](https://github.com/${c})`)
              .join("\n") +
              (contributors.length > 30
                ? `\nand ${contributors.length - 30} more...`
                : ""),
          )
          .setColor(0x7289da),
      ],
    });
  },
};
