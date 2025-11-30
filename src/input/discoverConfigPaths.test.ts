import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  createConfigFile,
  createNestedConfigDirs,
  setupSymlinkAndIgnoredDirs,
  writeConfigFiles,
} from "../test/helpers/configFile.js";
import { discoverConfigPaths } from "./discoverConfigPaths.js";

test("returns provided path when recursion is disabled", async () => {
  const configPath = await createConfigFile({ project: "solo", checks: [] });
  const directory = path.dirname(configPath);
  const fileName = path.basename(configPath);

  const paths = await discoverConfigPaths(directory, fileName, false);

  assert.deepEqual(paths, [configPath]);
});

test("recursively discovers configs when requested", async () => {
  const setup = await createNestedConfigDirs();
  await writeConfigFiles(setup);

  const paths = await discoverConfigPaths(
    setup.baseDir,
    "checks.config.json",
    true,
  );

  assert.deepEqual(paths, [setup.rootConfigPath, setup.nestedConfigPath]);
});

test("throws when recursive search finds no configs", async () => {
  const setup = await createNestedConfigDirs();

  await assert.rejects(
    () => discoverConfigPaths(setup.baseDir, "missing.json", true),
    /No config files named/,
  );
});

test("skips symlinks and ignored directories when searching recursively", async () => {
  const setup = await createNestedConfigDirs();
  await setupSymlinkAndIgnoredDirs(setup);

  const paths = await discoverConfigPaths(
    setup.baseDir,
    "checks.config.json",
    true,
  );

  assert.deepEqual(paths, [setup.nestedConfigPath]);
});
