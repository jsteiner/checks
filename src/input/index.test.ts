import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createConfigFile } from "../test/helpers/configFile.js";
import { buildInput } from "./index.js";

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
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-input-"));
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

  const input = await buildInput(["node", "checks", baseDir, "--recursive"]);

  const names = input.projects.map((config) => config.project);
  const paths = input.projects.map((config) => config.path);
  const workingDirs = input.projects.map((config) => config.checks[0]?.cwd);

  assert.deepEqual(names, ["root", "nested"]);
  assert.deepEqual(paths, [rootConfigPath, nestedConfigPath]);
  assert.deepEqual(workingDirs, [baseDir, nestedDir]);
});

test("throws when recursive search finds no configs", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-input-"));

  await assert.rejects(
    () =>
      buildInput(["node", "checks", baseDir, "--recursive"]).catch((error) => {
        assert.match(
          error instanceof Error ? error.message : "",
          /No config files named/,
        );
        throw error;
      }),
    /No config files named/,
  );
});

test("skips symlinks and ignored directories when searching recursively", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-input-"));
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

  const input = await buildInput(["node", "checks", baseDir, "--recursive"]);

  assert.deepEqual(
    input.projects.map((config) => config.path),
    [configPath],
  );
});

test("uses directory argument to resolve config path", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-input-"));
  const configPath = path.join(baseDir, "checks.config.json");

  await fs.writeFile(
    configPath,
    JSON.stringify({
      project: "test-project",
      checks: [{ name: "lint", command: "echo lint" }],
    }),
    "utf8",
  );

  const input = await buildInput(["node", "checks", baseDir]);

  assert.equal(input.projects.length, 1);
  assert.equal(input.projects[0]?.project, "test-project");
  assert.equal(input.projects[0]?.path, configPath);
  assert.equal(input.projects[0]?.checks[0]?.cwd, baseDir);
});

test("recursively discovers configs from specified directory", async () => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-input-"));
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

  const input = await buildInput(["node", "checks", baseDir, "--recursive"]);

  const names = input.projects.map((config) => config.project);
  const paths = input.projects.map((config) => config.path);

  assert.deepEqual(names, ["root", "nested"]);
  assert.deepEqual(paths, [rootConfigPath, nestedConfigPath]);
});
