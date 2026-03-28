import { ActivityType } from "discord.js";

export default (client) => {
  client.user.setPresence({
    activities: [
      {
        name: "use ;compile to compile or ;suggest for code suggestions | QuillBot",
        type: ActivityType.Playing,
      },
    ],
    status: "online",
  });
};
