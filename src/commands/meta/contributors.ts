import { MessageFlags } from "discord.js";
import type { SubcommandCallbackOpts } from "../../types/command.ts";
import { buildComponents } from "../../utils/components/buildComponents.ts";

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
      flags: MessageFlags.IsComponentsV2,
      components: buildComponents([
        {
          type: "container",
          accentColor: 0x7289da,
          components: [
            { type: "text", content: `### 💻 GitHub Contributors` },
            { type: "separator", spacing: "small" },
            {
              type: "text",
              content:
                contributors
                  .slice(0, 30)
                  .map((c: string) => `- [@${c}](https://github.com/${c})`)
                  .join("\n") +
                (contributors.length > 30
                  ? `\nand ${contributors.length - 30} more...`
                  : ""),
            },
            { type: "separator", spacing: "small" },

            {
              type: "actionRow",
              components: [
                {
                  type: "button",
                  style: "link",
                  label: "View All Contributors",
                  url: "https://github.com/open-devhub/quillbot/contributors",
                },
              ],
            },
          ],
        },
      ]),
    });
  },
};
