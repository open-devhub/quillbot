import { ActivityType } from "discord.js";

export default (client) => {
  const opts = {
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
      client.user.setPresence(opts);
    },
    60 * 60 * 1000,
  );
};
