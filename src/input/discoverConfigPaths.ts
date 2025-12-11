import fs from "node:fs/promises";
import path from "node:path";
import { FileConfigError, loadFileConfig } from "./fileConfig.js";

export async function discoverConfigPaths(
  directory: string,
  configFileName: string,
  recursive: boolean,
): Promise<string[]> {
  const resolvedDir = path.resolve(directory);
  const rootConfigPath = path.join(resolvedDir, configFileName);

  if (!recursive) {
    return [rootConfigPath];
  }

  const rootConfig = await loadFileConfig(rootConfigPath);
  const children = rootConfig.children ?? [];

  if (children.length === 0) {
    return [rootConfigPath];
  }

  const childPaths = await Promise.all(
    children.map(async (childPath) => {
      const resolvedChildDir = path.isAbsolute(childPath)
        ? childPath
        : path.join(resolvedDir, childPath);
      const childConfigPath = path.join(resolvedChildDir, configFileName);

      try {
        await fs.access(childConfigPath);
      } catch {
        throw new FileConfigError(
          `Child config not found: ${childConfigPath} (from children entry "${childPath}")`,
        );
      }

      return childConfigPath;
    }),
  );

  return [rootConfigPath, ...childPaths];
}
