import type { ProjectDefinition, SuiteDefinition } from "../types.js";
import { type CLIOptions, parseCLIOptions } from "./cli.js";
import { discoverConfigPaths } from "./discoverConfigPaths.js";
import { FILE_CONFIG_PATH, loadFileConfig } from "./fileConfig.js";
import { resolveProjectColor } from "./projectColors.js";

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
    paths.map(async (path, index) => {
      const config = await loadFileConfig(path);
      return {
        ...config,
        color: resolveProjectColor(config.color, index),
        path,
      };
    }),
  );

  return { projects, options };
}
