import { ActivityType, Client, type PresenceData } from "discord.js";

export default (client: Client) => {
  const opts: PresenceData = {
    activities: [
      {
        name: ";help | Quill",
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  };
  client?.user?.setPresence(opts);
  setInterval(
    () => {
      client?.user?.setPresence(opts);
    },
    60 * 60 * 1000,
  );
};
