import { ActivityType } from "discord.js";

export default (client) => {
  client.user.setPresence({
    activities: [
      {
        name: ";help | Quill",
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  });
};
