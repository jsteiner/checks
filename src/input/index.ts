import { type CLIOptions, parseCLIOptions } from "./cli.js";
import {
  FILE_CONFIG_PATH,
  type FileConfig,
  loadFileConfig,
} from "./fileConfig.js";

export type Input = {
  config: FileConfig;
  options: CLIOptions;
};

export async function buildInput(
  configPath: string = FILE_CONFIG_PATH,
  argv: string[] = process.argv,
): Promise<Input> {
  const config = await loadFileConfig(configPath);
  const options = parseCLIOptions(argv);
  return { config, options };
}
