import {
  createDocument,
  getDocument,
  updateDocument,
} from "../firestore/firestore.ts";

const SAVE_THRESHOLD = 5;
let globalCommandCount = 0;
let commandBuffer: Record<string, number> = {};
let serverBuffer: Record<string, { commandCount: number; guildName: string }> =
  {};

/**
 * Get the start date of the current period
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
/**
 * Get the start date of the current period
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @returns {string} ISO date string (YYYY-MM-DD)
 */
function getPeriodStartDate(period: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (period === "daily") {
    return now.toISOString().split("T")[0] || "";
  } else if (period === "weekly") {
    const start = new Date(now);
    start.setDate(start.getDate() - start.getDay());
    return start.toISOString().split("T")[0] || "";
  } else if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString().split("T")[0] || "";
  }

  return now.toISOString().split("T")[0] || "";
}

/**
 * Check if a period has expired and should be reset
 * @param {string} storedPeriodStart - Stored period start date
 * @param {string} period - 'daily', 'weekly', or 'monthly'
 * @returns {boolean} Whether the period should be reset
 */
function isPeriodExpired(storedPeriodStart: string, period: string): boolean {
  const currentStart = getPeriodStartDate(period);
  return storedPeriodStart !== currentStart;
}

function getBufferedCommandCount(): number {
  return (Object.values(commandBuffer) as number[]).reduce(
    (sum, count) => sum + count,
    0,
  );
}

async function flushStatsOnExit(): Promise<void> {
  const bufferedCommandCount = getBufferedCommandCount();
  if (bufferedCommandCount === 0) return;
  await saveStats();
}

/**
 * Track command usage statistics
 * @param {string} commandName - The original command name (not alias)
 * @param {string} guildId - The guild/server ID
 * @param {boolean} isDevOnly - Whether this is a dev-only command
 * @param {any} client - Discord client instance
 */
export async function trackCommandStat(
  commandName: string,
  guildId: string,
  isDevOnly: boolean,
  client: any,
): Promise<void> {
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
async function saveStats(): Promise<void> {
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
async function updateGlobalStats(commandCount: number): Promise<void> {
  try {
    const globalDoc = (await getDocument("stats", "global")) as any;

    const dailyStart = getPeriodStartDate("daily");
    const weeklyStart = getPeriodStartDate("weekly");
    const monthlyStart = getPeriodStartDate("monthly");

    if (!globalDoc) {
      await createDocument("stats", "global", {
        totalCommandsRan: commandCount,
        daily: {
          commandsRan: commandCount,
          periodStart: dailyStart,
        },
        weekly: {
          commandsRan: commandCount,
          periodStart: weeklyStart,
        },
        monthly: {
          commandsRan: commandCount,
          periodStart: monthlyStart,
        },
      });
    } else {
      const updates: Record<string, any> = {
        totalCommandsRan: (globalDoc.totalCommandsRan || 0) + commandCount,
      };

      if (
        globalDoc.daily &&
        !isPeriodExpired(globalDoc.daily.periodStart, "daily")
      ) {
        updates["daily.commandsRan"] =
          globalDoc.daily.commandsRan + commandCount;
      } else {
        updates["daily"] = {
          commandsRan: commandCount,
          periodStart: dailyStart,
        };
      }

      if (
        globalDoc.weekly &&
        !isPeriodExpired(globalDoc.weekly.periodStart, "weekly")
      ) {
        updates["weekly.commandsRan"] =
          globalDoc.weekly.commandsRan + commandCount;
      } else {
        updates["weekly"] = {
          commandsRan: commandCount,
          periodStart: weeklyStart,
        };
      }

      if (
        globalDoc.monthly &&
        !isPeriodExpired(globalDoc.monthly.periodStart, "monthly")
      ) {
        updates["monthly.commandsRan"] =
          globalDoc.monthly.commandsRan + commandCount;
      } else {
        updates["monthly"] = {
          commandsRan: commandCount,
          periodStart: monthlyStart,
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
async function updateMostUsedCommands(): Promise<void> {
  try {
    const commandDoc = (await getDocument("stats", "commands")) as any;
    const updates: Record<string, number> = {};

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
async function updateServerStats(): Promise<void> {
  try {
    const dailyStart = getPeriodStartDate("daily");
    const weeklyStart = getPeriodStartDate("weekly");

    for (const [guildId, serverData] of Object.entries(serverBuffer)) {
      const serverDoc = (await getDocument("servers", guildId)) as any;
      const commandCount = serverData.commandCount;
      const guildName = serverData.guildName || "";

      if (!serverDoc) {
        await createDocument("servers", guildId, {
          name: guildName,
          totalCommandsRan: commandCount,
          daily: {
            commandsRan: commandCount,
            periodStart: dailyStart,
          },
          weekly: {
            commandsRan: commandCount,
            periodStart: weeklyStart,
          },
        });
      } else {
        const updates: Record<string, any> = {
          totalCommandsRan: (serverDoc.totalCommandsRan || 0) + commandCount,
        };

        if (guildName && serverDoc.name !== guildName) {
          updates.name = guildName;
        }

        if (
          serverDoc.daily &&
          !isPeriodExpired(serverDoc.daily.periodStart, "daily")
        ) {
          updates["daily.commandsRan"] =
            serverDoc.daily.commandsRan + commandCount;
        } else {
          updates["daily"] = {
            commandsRan: commandCount,
            periodStart: dailyStart,
          };
        }

        if (
          serverDoc.weekly &&
          !isPeriodExpired(serverDoc.weekly.periodStart, "weekly")
        ) {
          updates["weekly.commandsRan"] =
            serverDoc.weekly.commandsRan + commandCount;
        } else {
          updates["weekly"] = {
            commandsRan: commandCount,
            periodStart: weeklyStart,
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
export async function getStats(): Promise<{ global: any; commands: any }> {
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
 * @returns {Promise<any>} Server stats
 */
export async function getServerStats(guildId: string): Promise<any> {
  try {
    return await getDocument("servers", guildId);
  } catch (error) {
    console.error("Error fetching server stats:", error);
    return null;
  }
}
