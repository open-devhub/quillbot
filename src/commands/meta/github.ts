import { EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import type { SubcommandCallbackOpts } from "../../types/command.ts";

export default {
  name: "github",
  description: "Get the GitHub information for Quill bot.",
  usage: "%pgithub <repo | issues | prs | contributors | org>",
  callback: {
    repo({ message }: SubcommandCallbackOpts) {
      return message.reply("https://github.com/open-devhub/quillbot");
    },
    issues({ message }: SubcommandCallbackOpts) {
      return message.reply("https://github.com/open-devhub/quillbot/issues");
    },
    prs({ message }: SubcommandCallbackOpts) {
      return message.reply("https://github.com/open-devhub/quillbot/pulls");
    },
    async contributors({ message }: SubcommandCallbackOpts) {
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
    org({ message }: SubcommandCallbackOpts) {
      return message.reply("https://github.com/open-devhub");
    },
  },
};
