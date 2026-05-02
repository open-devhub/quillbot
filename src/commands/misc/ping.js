export default {
  name: "ping",
  description: "Check the bot's latency and websocket ping",
  callback(client, message, args) {
    try {
      const ping = Date.now() - message.createdTimestamp;
      message.reply(`Pong! ${ping}ms | Websocket: ${client.ws.ping}ms`);
    } catch (err) {
      console.error(err);
    }
  },
};
