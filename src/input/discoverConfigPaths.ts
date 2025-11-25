import fs from "node:fs/promises";
import path from "node:path";
import { FileConfigError } from "./fileConfig.js";

export async function discoverConfigPaths(
  configPath: string,
  recursive: boolean,
): Promise<string[]> {
  if (!recursive) {
    return [configPath];
  }

  const baseDir = path.dirname(configPath);
  const fileName = path.basename(configPath);
  const skippedDirs = new Set(["node_modules", ".git"]);

  const matches: string[] = [];
  await walkForConfigs(baseDir, {
    fileName,
    skippedDirs,
    matches,
  });

  if (matches.length === 0) {
    throw new FileConfigError(
      `No config files named ${fileName} found under ${baseDir}`,
    );
  }

  return matches.sort();
}

interface WalkOptions {
  fileName: string;
  skippedDirs: Set<string>;
  matches: string[];
}

async function walkForConfigs(
  dir: string,
  options: WalkOptions,
): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    throw new FileConfigError(`Failed to read directory ${dir}`);
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (options.skippedDirs.has(entry.name)) continue;
      await walkForConfigs(fullPath, options);
      continue;
    }

    if (entry.isFile() && entry.name === options.fileName) {
      options.matches.push(fullPath);
    }
  }
}
