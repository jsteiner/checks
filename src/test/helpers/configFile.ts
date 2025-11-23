import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function createRawConfigFile(
  fileName = "checks.config.json",
  contents = "",
): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-config-"));
  const configPath = path.join(dir, fileName);
  await fs.writeFile(configPath, contents, "utf8");
  return configPath;
}

export async function createConfigFile(
  config: Record<string, unknown> = {},
  fileName = "checks.config.json",
): Promise<string> {
  return createRawConfigFile(fileName, JSON.stringify(config));
}
