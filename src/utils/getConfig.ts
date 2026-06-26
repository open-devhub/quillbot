import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function getConfig() {
  try {
    const config = await fs.readFile(
      path.join(__dirname, "..", "..", "config.json"),
      "utf-8",
    );
    return JSON.parse(config);
  } catch (err) {
    console.error("Error reading config file:", err);
  }
}
