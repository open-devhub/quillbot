import { createDocument, getDocument, updateDocument } from "./firestore.js";

const SAVE_THRESHOLD = 5;
let globalCommandCount = 0;
let commandBuffer = {};
let serverBuffer = {};

/**
 * Get the expiration date for a period
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @returns {string} ISO date string
 */
function getExpirationDate(period) {
  const now = new Date();
  let expDate = new Date(now);

  if (period === "daily") {
    expDate.setDate(expDate.getDate() + 1);
  } else if (period === "weekly") {
    expDate.setDate(expDate.getDate() + 7);
  } else if (period === "monthly") {
    expDate.setMonth(expDate.getMonth() + 1);
  }

  return expDate.toISOString().split("T")[0];
}

/**
 * Get the current period date for grouping
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @returns {string} ISO date string
 */
function getPeriodDate(period) {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getBufferedCommandCount() {
  return Object.values(commandBuffer).reduce((sum, count) => sum + count, 0);
}

async function flushStatsOnExit() {
  const bufferedCommandCount = getBufferedCommandCount();
  if (bufferedCommandCount === 0) return;
  await saveStats();
}

/**
 * Track command usage statistics
 * @param {string} commandName - The original command name (not alias)
 * @param {string} guildId - The guild/server ID
 * @param {boolean} isDevOnly - Whether this is a dev-only command
 * @param {Client} client - Discord client instance
 */
export async function trackCommandStat(
  commandName,
  guildId,
  isDevOnly,
  client,
) {
  if (isDevOnly) return;

  globalCommandCount++;
  commandBuffer[commandName] = (commandBuffer[commandName] || 0) + 1;

  if (!serverBuffer[guildId]) {
    let guildName = "";
    if (client) {
      try {
        const guild = await client.guilds.fetch(guildId);
        guildName = guild.name;
      } catch (e) {}
    }
    serverBuffer[guildId] = { commandCount: 0, guildName };
  }

  serverBuffer[guildId].commandCount++;

  if (globalCommandCount % SAVE_THRESHOLD === 0) {
    await saveStats();
  }
}

/**
 * Save accumulated stats to Firestore
 */
async function saveStats() {
  try {
    const bufferedCommandCount = getBufferedCommandCount();
    if (bufferedCommandCount === 0) return;

    await updateGlobalStats(bufferedCommandCount);
    await updateMostUsedCommands();
    await updateServerStats();

    commandBuffer = {};
    serverBuffer = {};
  } catch (error) {
    console.error("[STATS] Error saving stats:", error);
  }
}

/**
 * Update global command statistics
 */
async function updateGlobalStats(commandCount) {
  try {
    const globalDoc = await getDocument("stats", "global");

    const dailyExpires = getExpirationDate("daily");
    const weeklyExpires = getExpirationDate("weekly");
    const monthlyExpires = getExpirationDate("monthly");

    if (!globalDoc) {
      await createDocument("stats", "global", {
        totalCommandsRan: commandCount,
        daily: {
          commandsRan: commandCount,
          expiresAt: dailyExpires,
        },
        weekly: {
          commandsRan: commandCount,
          expiresAt: weeklyExpires,
        },
        monthly: {
          commandsRan: commandCount,
          expiresAt: monthlyExpires,
        },
      });
    } else {
      const updates = {
        totalCommandsRan: (globalDoc.totalCommandsRan || 0) + commandCount,
      };

      if (globalDoc.daily && globalDoc.daily.expiresAt === dailyExpires) {
        updates["daily.commandsRan"] =
          globalDoc.daily.commandsRan + commandCount;
      } else {
        updates["daily"] = {
          commandsRan: commandCount,
          expiresAt: dailyExpires,
        };
      }

      if (globalDoc.weekly && globalDoc.weekly.expiresAt === weeklyExpires) {
        updates["weekly.commandsRan"] =
          globalDoc.weekly.commandsRan + commandCount;
      } else {
        updates["weekly"] = {
          commandsRan: commandCount,
          expiresAt: weeklyExpires,
        };
      }

      if (globalDoc.monthly && globalDoc.monthly.expiresAt === monthlyExpires) {
        updates["monthly.commandsRan"] =
          globalDoc.monthly.commandsRan + commandCount;
      } else {
        updates["monthly"] = {
          commandsRan: commandCount,
          expiresAt: monthlyExpires,
        };
      }

      await updateDocument("stats", "global", updates);
    }
  } catch (error) {
    console.error("Error updating global stats:", error);
  }
}

/**
 * Update most used commands
 */
async function updateMostUsedCommands() {
  try {
    const commandDoc = await getDocument("stats", "commands");
    const updates = {};

    for (const [commandName, count] of Object.entries(commandBuffer)) {
      const currentCount = commandDoc?.[commandName] || 0;
      updates[commandName] = currentCount + count;
    }

    if (Object.keys(updates).length === 0) return;

    if (!commandDoc) {
      await createDocument("stats", "commands", updates);
    } else {
      await updateDocument("stats", "commands", updates);
    }
  } catch (error) {
    console.error("Error updating command stats:", error);
  }
}

/**
 * Update server-specific statistics
 */
async function updateServerStats() {
  try {
    const dailyExpires = getExpirationDate("daily");
    const weeklyExpires = getExpirationDate("weekly");

    for (const [guildId, serverData] of Object.entries(serverBuffer)) {
      const serverDoc = await getDocument("servers", guildId);
      const commandCount = serverData.commandCount;
      const guildName = serverData.guildName || "";

      if (!serverDoc) {
        await createDocument("servers", guildId, {
          name: guildName,
          totalCommandsRan: commandCount,
          daily: {
            commandsRan: commandCount,
            expiresAt: getExpirationDate("daily"),
          },
          weekly: {
            commandsRan: commandCount,
            expiresAt: getExpirationDate("weekly"),
          },
        });
      } else {
        const updates = {
          totalCommandsRan: (serverDoc.totalCommandsRan || 0) + commandCount,
        };

        if (guildName && serverDoc.name !== guildName) {
          updates.name = guildName;
        }

        if (serverDoc.daily && serverDoc.daily.expiresAt === dailyExpires) {
          updates["daily.commandsRan"] =
            serverDoc.daily.commandsRan + commandCount;
        } else {
          updates["daily"] = {
            commandsRan: commandCount,
            expiresAt: dailyExpires,
          };
        }

        if (serverDoc.weekly && serverDoc.weekly.expiresAt === weeklyExpires) {
          updates["weekly.commandsRan"] =
            serverDoc.weekly.commandsRan + commandCount;
        } else {
          updates["weekly"] = {
            commandsRan: commandCount,
            expiresAt: weeklyExpires,
          };
        }

        await updateDocument("servers", guildId, updates);
      }
    }
  } catch (error) {
    console.error("Error updating server stats:", error);
  }
}

/**
 * Get all statistics for display
 * @returns {Promise<Object>} Stats object with global, commands, and servers data
 */
export async function getStats() {
  try {
    const globalDoc = await getDocument("stats", "global");
    const commandsDoc = await getDocument("stats", "commands");

    return {
      global: globalDoc || {},
      commands: commandsDoc || {},
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    return { global: {}, commands: {} };
  }
}

/**
 * Get specific server statistics
 * @param {string} guildId
 * @returns {Promise<Object>} Server stats
 */
export async function getServerStats(guildId) {
  try {
    return await getDocument("servers", guildId);
  } catch (error) {
    console.error("Error fetching server stats:", error);
    return null;
  }
}
