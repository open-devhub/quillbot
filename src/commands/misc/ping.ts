import type { Client, Message } from "discord.js";

export default {
  name: "ping",
  description: "Check the bot's latency and websocket ping",
  async callback(client: Client, message: Message, args: string[]) {
    try {
      const ping = Date.now() - message.createdTimestamp;
      message.reply(`Pong! ${ping}ms | Websocket: ${client.ws.ping}ms`);
    } catch (err) {
      console.error(err);
    }
  },
};
