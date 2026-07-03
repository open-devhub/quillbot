import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = path.join(__dirname, "..", "commands");

interface CommandMeta {
  name: string;
  aliases: string[];
  filePath: string;
}

/**
 * Global registry for all names and aliases (each must be unique)
 */
const identifierRegistry = new Map<string, CommandMeta[]>();

async function getAllCommandFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllCommandFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

async function parseCommandFile(filePath: string): Promise<CommandMeta | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");

    const nameMatch = content.match(/name\s*:\s*["'`]([^"'`]+)["'`]/);
    if (!nameMatch) {
      console.warn(
        `⚠️  Skipped (no name found): ${path.relative(COMMANDS_DIR, filePath)}`,
      );
      return null;
    }

    const name = nameMatch[1]?.toLowerCase().trim();

    const aliasesMatch = content.match(/aliases\s*:\s*\[([^\]]*)\]/);
    let aliases: string[] = [];

    if (aliasesMatch) {
      const aliasesContent = aliasesMatch[1];
      const aliasMatches = aliasesContent?.match(/["'`]([^"'`]+)["'`]/g);
      if (aliasMatches) {
        aliases = aliasMatches
          .map((a) => a.replace(/["'`]/g, "").toLowerCase().trim())
          .filter(Boolean);
      }
    }

    return {
      name: name || "",
      aliases,
      filePath: path.relative(COMMANDS_DIR, filePath),
    };
  } catch (err) {
    console.error(`❌ Failed to read ${path.relative(COMMANDS_DIR, filePath)}`);
    return null;
  }
}

function registerCommand(cmd: CommandMeta): boolean {
  let hasConflict = false;
  const identifiers = [cmd.name, ...cmd.aliases];

  for (const id of identifiers) {
    if (!identifierRegistry.has(id)) {
      identifierRegistry.set(id, []);
    }

    const existing = identifierRegistry.get(id)!;

    // Conflict if already used by a different file
    const conflict = existing.some((c) => c.filePath !== cmd.filePath);
    if (conflict) hasConflict = true;

    existing.push(cmd);
  }

  return hasConflict;
}

/**
 * Print nice conflict report
 */
function printConflicts() {
  console.log("\n" + "═".repeat(70));
  console.log("🔍  COMMAND NAME & ALIAS CONFLICT SCANNER");
  console.log("═".repeat(70) + "\n");

  let totalConflicts = 0;
  const reported = new Set<string>();

  for (const [identifier, commands] of identifierRegistry) {
    const uniqueFiles = new Set(commands.map((c) => c.filePath));

    if (uniqueFiles.size > 1 && !reported.has(identifier)) {
      reported.add(identifier);
      totalConflicts++;

      console.log(`❌ CONFLICT: "${identifier}" is used in multiple places:\n`);
      for (const cmd of commands) {
        const role = cmd.name === identifier ? "name" : "alias";
        console.log(`   → ${cmd.filePath}   (as ${role})`);
      }
      console.log("");
    }
  }

  console.log("═".repeat(70));

  if (totalConflicts === 0) {
    console.log(
      "✅  No conflicts found! All command names and aliases are globally unique.",
    );
  } else {
    console.log(`❌  Found ${totalConflicts} conflicting identifier(s).`);
    console.log(
      "    Every name and every alias across the bot must be unique.",
    );
  }
  console.log("═".repeat(70) + "\n");
}

/**
 * Main
 */
async function main() {
  console.log(
    "🔎 Scanning all command files (static mode - safe, no execution)...\n",
  );

  const files = await getAllCommandFiles(COMMANDS_DIR);
  console.log(`Found ${files.length} command files.\n`);

  for (const file of files) {
    const cmd = await parseCommandFile(file);
    if (cmd) {
      registerCommand(cmd);
    }
  }

  printConflicts();
}

main().catch(console.error);
