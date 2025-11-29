import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createConfigFile } from "../test/helpers/configFile.js";
import { discoverConfigPaths } from "./discoverConfigPaths.js";

test("returns provided path when recursion is disabled", async () => {
  const configPath = await createConfigFile({ project: "solo", checks: [] });
  const directory = path.dirname(configPath);
  const fileName = path.basename(configPath);

  const paths = await discoverConfigPaths(directory, fileName, false);

  assert.deepEqual(paths, [configPath]);
});

test("recursively discovers configs when requested", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "discover-paths-"));
  const nestedDir = path.join(baseDir, "nested");
  await fs.mkdir(nestedDir);

  const rootConfigPath = path.join(baseDir, "checks.config.json");
  const nestedConfigPath = path.join(nestedDir, "checks.config.json");

  await fs.writeFile(
    rootConfigPath,
    JSON.stringify({
      project: "root",
      checks: [{ name: "alpha", command: "echo alpha" }],
    }),
    "utf8",
  );

  await fs.writeFile(
    nestedConfigPath,
    JSON.stringify({
      project: "nested",
      checks: [{ name: "beta", command: "echo beta" }],
    }),
    "utf8",
  );

  const paths = await discoverConfigPaths(baseDir, "checks.config.json", true);

  assert.deepEqual(paths, [rootConfigPath, nestedConfigPath]);
});

test("throws when recursive search finds no configs", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "discover-paths-"));

  await assert.rejects(
    () => discoverConfigPaths(baseDir, "missing.json", true),
    /No config files named/,
  );
});

test("skips symlinks and ignored directories when searching recursively", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "discover-paths-"));
  const nestedDir = path.join(baseDir, "nested");
  const nodeModulesDir = path.join(baseDir, "node_modules");
  await Promise.all([fs.mkdir(nestedDir), fs.mkdir(nodeModulesDir)]);

  const configPath = path.join(nestedDir, "checks.config.json");
  await fs.writeFile(
    configPath,
    JSON.stringify({
      project: "nested",
      checks: [{ name: "alpha", command: "echo alpha" }],
    }),
    "utf8",
  );

  const ignoredPath = path.join(nodeModulesDir, "checks.config.json");
  await fs.writeFile(
    ignoredPath,
    JSON.stringify({
      project: "ignored",
      checks: [{ name: "beta", command: "echo beta" }],
    }),
    "utf8",
  );

  const symlinkPath = path.join(baseDir, "checks.config.json");
  await fs.symlink(configPath, symlinkPath);

  const paths = await discoverConfigPaths(baseDir, "checks.config.json", true);

  assert.deepEqual(paths, [configPath]);
});
