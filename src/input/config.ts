import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const CONFIG_PATH = path.resolve(process.cwd(), "checks.config.json");

const checkSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  command: z.string().trim().min(1, "command is required"),
});

const configSchema = z.object({
  checks: z.array(checkSchema, { message: "checks must be an array" }),
});

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export type LoadedConfig = z.infer<typeof configSchema>;

export async function loadConfig(
  configPath: string = CONFIG_PATH,
): Promise<LoadedConfig> {
  let contents: string;
  try {
    contents = await fs.readFile(configPath, "utf8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new ConfigError(`Config file not found at ${configPath}`);
    }
    throw new ConfigError(`Failed to read config at ${configPath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new ConfigError(`Invalid JSON in config at ${configPath}`);
  }

  try {
    return configSchema.parse(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map((issue) => issue.message).join("; ");
      throw new ConfigError(`Invalid config structure: ${details}`);
    }
    throw error;
  }
}
