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

interface NestedConfigSetup {
  baseDir: string;
  nestedDir: string;
  rootConfigPath: string;
  nestedConfigPath: string;
}

export async function createNestedConfigDirs(): Promise<NestedConfigSetup> {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-input-"));
  const nestedDir = path.join(baseDir, "nested");
  await fs.mkdir(nestedDir);

  const rootConfigPath = path.join(baseDir, "checks.config.json");
  const nestedConfigPath = path.join(nestedDir, "checks.config.json");

  return {
    baseDir,
    nestedDir,
    rootConfigPath,
    nestedConfigPath,
  };
}

export async function writeConfigFiles(
  paths: { rootConfigPath: string; nestedConfigPath: string },
  rootConfig: Record<string, unknown> = {
    project: "root",
    checks: [{ name: "alpha", command: "echo alpha" }],
    children: ["nested"],
  },
  nestedConfig: Record<string, unknown> = {
    project: "nested",
    checks: [{ name: "beta", command: "echo beta" }],
  },
): Promise<void> {
  await fs.writeFile(paths.rootConfigPath, JSON.stringify(rootConfig), "utf8");

  await fs.writeFile(
    paths.nestedConfigPath,
    JSON.stringify(nestedConfig),
    "utf8",
  );
}
