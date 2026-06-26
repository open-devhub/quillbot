import type { Client, Message } from "discord.js";

export type CommandCallbackOpts = {
  client: Client;
  message: Message;
  args: string[];
};

export type SubcommandCallbackOpts = CommandCallbackOpts;
