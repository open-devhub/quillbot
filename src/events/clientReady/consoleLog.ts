import type { Client } from "discord.js";

export default (client: Client) => {
  if (!client.user) return;
  console.log(`${client.user.tag} is online.`);
};
