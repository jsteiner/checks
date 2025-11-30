import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  createConfigFile,
  createNestedConfigDirs,
  setupSymlinkAndIgnoredDirs,
  writeConfigFiles,
} from "../test/helpers/configFile.js";
import { buildInput } from "./index.js";

async function buildRecursiveInput() {
  const setup = await createNestedConfigDirs();
  await writeConfigFiles(setup);

  const input = await buildInput([
    "node",
    "checks",
    setup.baseDir,
    "--recursive",
  ]);

  return {
    input,
    setup,
    names: input.projects.map((config) => config.project),
    paths: input.projects.map((config) => config.path),
  };
}

test("builds config and CLI options", async () => {
  const configPath = await createConfigFile({
    project: "project",
    checks: [
      { name: "lint", command: "pnpm lint" },
      { name: "test", command: "pnpm test" },
    ],
  });
  const configDir = path.dirname(configPath);

  const input = await buildInput([
    "node",
    "checks",
    configDir,
    "--interactive",
  ]);

  assert.equal(input.options.interactive, true);
  assert.equal(input.options.failFast, false);
  assert.equal(input.options.recursive, false);
  assert.equal(input.projects.length, 1);
  assert.equal(input.projects[0]?.project, "project");
  assert.equal(input.projects[0]?.path, configPath);
  assert.deepEqual(input.projects[0]?.checks, [
    { name: "lint", command: "pnpm lint", cwd: configDir },
    { name: "test", command: "pnpm test", cwd: configDir },
  ]);
});

test("recursively discovers configs when requested", async () => {
  const { input, setup, names, paths } = await buildRecursiveInput();

  const workingDirs = input.projects.map((config) => config.checks[0]?.cwd);

  assert.deepEqual(names, ["root", "nested"]);
  assert.deepEqual(paths, [setup.rootConfigPath, setup.nestedConfigPath]);
  assert.deepEqual(workingDirs, [setup.baseDir, setup.nestedDir]);
});

test("throws when recursive search finds no configs", async () => {
  const setup = await createNestedConfigDirs();

  await assert.rejects(
    () =>
      buildInput(["node", "checks", setup.baseDir, "--recursive"]).catch(
        (error) => {
          assert.match(
            error instanceof Error ? error.message : "",
            /No config files named/,
          );
          throw error;
        },
      ),
    /No config files named/,
  );
});

test("skips symlinks and ignored directories when searching recursively", async () => {
  const setup = await createNestedConfigDirs();
  await setupSymlinkAndIgnoredDirs(setup);

  const input = await buildInput([
    "node",
    "checks",
    setup.baseDir,
    "--recursive",
  ]);

  assert.deepEqual(
    input.projects.map((config) => config.path),
    [setup.nestedConfigPath],
  );
});

test("uses directory argument to resolve config path", async () => {
  const configPath = await createConfigFile({
    project: "test-project",
    checks: [{ name: "lint", command: "echo lint" }],
  });
  const baseDir = path.dirname(configPath);

  const input = await buildInput(["node", "checks", baseDir]);

  assert.equal(input.projects.length, 1);
  assert.equal(input.projects[0]?.project, "test-project");
  assert.equal(input.projects[0]?.path, configPath);
  assert.equal(input.projects[0]?.checks[0]?.cwd, baseDir);
});

test("recursively discovers configs from specified directory", async () => {
  const { setup, names, paths } = await buildRecursiveInput();

  assert.deepEqual(names, ["root", "nested"]);
  assert.deepEqual(paths, [setup.rootConfigPath, setup.nestedConfigPath]);
});
