import type {
  CommandCallbackOpts,
  SubcommandCallbackOpts,
} from "../../types/command.ts";
import contributors from "./contributors.ts";

export default {
  name: "github",
  description: "Get the GitHub information for Quill bot.",
  usage: "github <repo | issues | prs | contributors | org>",
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
    contributors: async ({ message }: SubcommandCallbackOpts) =>
      contributors.callback({ message } as CommandCallbackOpts),
    org({ message }: SubcommandCallbackOpts) {
      return message.reply("https://github.com/open-devhub");
    },
  },
};
