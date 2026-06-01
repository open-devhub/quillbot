import path from "path";
import { readFile, writeFile } from "./fileOps.js";
import { getAllDocuments } from "./firestore.js";

import fsp from "fs/promises";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = path.join(__dirname, "..", "data");
fsp.mkdir(dataDir, { recursive: true }).catch((err) => {
  console.error("Error creating data directory:", err);
});

const cacheFilePath = path.join(__dirname, "..", "data", "cache.json");

export async function cacheDB() {
  const cacheDB = {};

  const premiumServers = await getAllDocuments("premiumServers");
  if (premiumServers) {
    cacheDB.premiumServers = premiumServers;
  }

  try {
    await writeFile(cacheFilePath, JSON.stringify(cacheDB, null, 2));
  } catch (err) {
    console.error("Error writing cacheDB to file:", err);
  }
}

export async function getCachedDB() {
  try {
    const cacheData = await readFile(cacheFilePath);
    return JSON.parse(cacheData);
  } catch (err) {
    console.error("Error reading cacheDB from file:", err);
    return null;
  }
}
