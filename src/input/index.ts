import { type CLIOptions, parseCLIOptions } from "./cli.js";
import { buildEnvironment, type Environment } from "./environment.js";
import {
  FILE_CONFIG_PATH,
  type FileConfig,
  loadFileConfig,
} from "./fileConfig.js";

export type Input = {
  config: FileConfig;
  options: CLIOptions;
  environment: Environment;
};

export async function buildInput(
  configPath: string = FILE_CONFIG_PATH,
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Input> {
  const environment = buildEnvironment(env);
  const config = await loadFileConfig(configPath);
  const options = parseCLIOptions(argv);
  return { config, options, environment };
}
