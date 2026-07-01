import type { Client, Message } from "discord.js";

export type Command = {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  premium?: boolean;
  devOnly?: boolean;
};

export type CommandModule = {
  default: Command;
};

export type CommandCallbackOpts = {
  client: Client;
  message: Message;
  args: string[];
};

export type SubcommandCallbackOpts = CommandCallbackOpts;
