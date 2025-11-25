import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectDefinition, SuiteDefinition } from "../types.js";
import { type CLIOptions, parseCLIOptions } from "./cli.js";
import {
  FILE_CONFIG_PATH,
  FileConfigError,
  loadFileConfig,
} from "./fileConfig.js";

export interface Input extends SuiteDefinition {
  projects: ProjectDefinition[];
  options: CLIOptions;
}

export async function buildInput(
  configPath: string = FILE_CONFIG_PATH,
  argv: string[] = process.argv,
): Promise<Input> {
  const options = parseCLIOptions(argv);
  const paths = await discoverConfigPaths(configPath, options.recursive);
  const projects: ProjectDefinition[] = await Promise.all(
    paths.map(async (path) => {
      const config = await loadFileConfig(path);
      return { ...config, path };
    }),
  );

  return { projects, options };
}

async function discoverConfigPaths(
  configPath: string,
  recursive: boolean,
): Promise<string[]> {
  if (!recursive) {
    return [configPath];
  }

  const baseDir = path.dirname(configPath);
  const fileName = path.basename(configPath);
  const matches: string[] = [];
  const skippedDirs = new Set(["node_modules", ".git"]);

  await walk(baseDir);

  if (matches.length === 0) {
    throw new FileConfigError(
      `No config files named ${fileName} found under ${baseDir}`,
    );
  }

  return matches.sort();

  async function walk(dir: string): Promise<void> {
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
        if (skippedDirs.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === fileName) {
        matches.push(fullPath);
      }
    }
  }
}
