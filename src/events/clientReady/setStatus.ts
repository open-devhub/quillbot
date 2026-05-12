import { ActivityType, Client, type PresenceData } from "discord.js";

export default (client: Client) => {
  if (!client.user) return;
  const opts: PresenceData = {
    activities: [
      {
        name: ";help | Quill",
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  };
  client.user.setPresence(opts);
  setInterval(
    () => {
      client.user && client.user.setPresence(opts);
    },
    60 * 60 * 1000,
  );
};
