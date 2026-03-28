export default {
  name: "ping",
  description: "Pong!",
  callback(client, message, args) {
    try {
      const ping = Date.now() - message.createdTimestamp;
      message.reply(`Pong! ${ping}ms | Websocket: ${client.ws.ping}ms`);
    } catch (err) {
      console.error(err);
    }
  },
};
