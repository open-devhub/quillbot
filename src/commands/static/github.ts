import { Client, EmbedBuilder, Message } from "discord.js";
import fetch from "node-fetch";

export default {
  name: "github",
  description: "Get the GitHub information for Quill bot.",
  usage: "%pgithub <repo | issues | prs | contributors | org>",
  callback: {
    async callback(client: Client, message: Message, args: string[]) {
      return message.reply("https://github.com/open-devhub/quillbot");
    },
    issues(client: Client, message: Message, args: string[]) {
      return message.reply("https://github.com/open-devhub/quillbot/issues");
    },
    prs(client: Client, message: Message, args: string[]) {
      return message.reply("https://github.com/open-devhub/quillbot/pulls");
    },
    async contributors(client: Client, message: Message, args: string[]) {
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
    org(client: Client, message: Message, args: string[]) {
      return message.reply("https://github.com/open-devhub");
    },
  },
};
