import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "vitest";
import { createConfigFile } from "../test/helpers/configFile.js";
import { discoverConfigPaths } from "./discoverConfigPaths.js";
import { FileConfigError } from "./fileConfig.js";

test("returns provided path when recursion is disabled", async () => {
  const configPath = await createConfigFile({ project: "solo", checks: [] });
  const directory = path.dirname(configPath);
  const fileName = path.basename(configPath);

  const paths = await discoverConfigPaths(directory, fileName, false);

  assert.deepEqual(paths, [configPath]);
});

test("returns only root config when no children defined", async () => {
  const configPath = await createConfigFile({
    project: "root",
    checks: [{ name: "test", command: "echo test" }],
  });
  const directory = path.dirname(configPath);
  const fileName = path.basename(configPath);

  const paths = await discoverConfigPaths(directory, fileName, true);

  assert.deepEqual(paths, [configPath]);
});

test("returns only root config when children is empty array", async () => {
  const configPath = await createConfigFile({
    project: "root",
    checks: [{ name: "test", command: "echo test" }],
    children: [],
  });
  const directory = path.dirname(configPath);
  const fileName = path.basename(configPath);

  const paths = await discoverConfigPaths(directory, fileName, true);

  assert.deepEqual(paths, [configPath]);
});

test("discovers configs from children field with relative paths", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-discover-"));
  const childDir = path.join(baseDir, "packages", "child");
  await fs.mkdir(childDir, { recursive: true });

  const rootConfigPath = path.join(baseDir, "checks.config.json");
  const childConfigPath = path.join(childDir, "checks.config.json");

  await fs.writeFile(
    rootConfigPath,
    JSON.stringify({
      project: "root",
      checks: [{ name: "root-test", command: "echo root" }],
      children: ["packages/child"],
    }),
    "utf8",
  );

  await fs.writeFile(
    childConfigPath,
    JSON.stringify({
      project: "child",
      checks: [{ name: "child-test", command: "echo child" }],
    }),
    "utf8",
  );

  const paths = await discoverConfigPaths(baseDir, "checks.config.json", true);

  assert.deepEqual(paths, [rootConfigPath, childConfigPath]);
});

test("discovers configs from children field with absolute paths", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-discover-"));
  const childDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-child-"));

  const rootConfigPath = path.join(baseDir, "checks.config.json");
  const childConfigPath = path.join(childDir, "checks.config.json");

  await fs.writeFile(
    rootConfigPath,
    JSON.stringify({
      project: "root",
      checks: [{ name: "root-test", command: "echo root" }],
      children: [childDir],
    }),
    "utf8",
  );

  await fs.writeFile(
    childConfigPath,
    JSON.stringify({
      project: "child",
      checks: [{ name: "child-test", command: "echo child" }],
    }),
    "utf8",
  );

  const paths = await discoverConfigPaths(baseDir, "checks.config.json", true);

  assert.deepEqual(paths, [rootConfigPath, childConfigPath]);
});

test("throws when child config not found", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-discover-"));
  const rootConfigPath = path.join(baseDir, "checks.config.json");

  await fs.writeFile(
    rootConfigPath,
    JSON.stringify({
      project: "root",
      checks: [{ name: "test", command: "echo test" }],
      children: ["missing-child"],
    }),
    "utf8",
  );

  await assert.rejects(
    () => discoverConfigPaths(baseDir, "checks.config.json", true),
    (error) => {
      assert.ok(error instanceof FileConfigError);
      assert.match(error.message, /Child config not found/);
      assert.match(error.message, /missing-child/);
      return true;
    },
  );
});

test("discovers multiple children", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-discover-"));
  const child1Dir = path.join(baseDir, "packages", "child1");
  const child2Dir = path.join(baseDir, "packages", "child2");
  await fs.mkdir(child1Dir, { recursive: true });
  await fs.mkdir(child2Dir, { recursive: true });

  const rootConfigPath = path.join(baseDir, "checks.config.json");
  const child1ConfigPath = path.join(child1Dir, "checks.config.json");
  const child2ConfigPath = path.join(child2Dir, "checks.config.json");

  await fs.writeFile(
    rootConfigPath,
    JSON.stringify({
      project: "root",
      checks: [],
      children: ["packages/child1", "packages/child2"],
    }),
    "utf8",
  );

  await fs.writeFile(
    child1ConfigPath,
    JSON.stringify({ project: "child1", checks: [] }),
    "utf8",
  );

  await fs.writeFile(
    child2ConfigPath,
    JSON.stringify({ project: "child2", checks: [] }),
    "utf8",
  );

  const paths = await discoverConfigPaths(baseDir, "checks.config.json", true);

  assert.deepEqual(paths, [rootConfigPath, child1ConfigPath, child2ConfigPath]);
});
