import assert from "node:assert/strict";
import test from "node:test";
import type { Input } from "../input/index.js";
import { getProjectColor } from "../input/projectColors.js";
import { Suite } from "../state/Suite.js";
import { createFakeSpawnedProcess } from "../test/helpers/fakeSpawnedProcess.js";
import { DEFAULT_TEST_DIMENSIONS } from "../test/helpers/terminal.js";
import { Executor } from "./index.js";
import { createDefaultSpawner, type SpawnFunction } from "./PtyProcess.js";

async function executeChecks(
  checks: Input["projects"][number]["checks"],
  options: Partial<Input["options"]> = {},
  spawn: SpawnFunction = createDefaultSpawner(),
  controller: AbortController = new AbortController(),
) {
  const project = {
    project: "config",
    path: "/tmp/checks.config.json",
    color: getProjectColor(0),
    checks,
  };
  const store = new Suite({ projects: [project] }, Date.now());
  const input: Input = {
    projects: [project],
    options: {
      interactive: false,
      failFast: false,
      recursive: false,
      filters: [],
      ...options,
    },
  };

  const executor = new Executor(
    input,
    store,
    controller.signal,
    DEFAULT_TEST_DIMENSIONS,
    spawn,
  );
  await executor.run();

  return { controller, input, store, executor };
}

test("aborts other running checks after the first failure when fail-fast is enabled", async () => {
  const checks: Input["projects"][number]["checks"] = [
    { name: "fail", command: "fail", cwd: "/tmp/project" },
    { name: "skip", command: "skip", cwd: "/tmp/project" },
  ];
  const started: string[] = [];
  const killed: Record<string, boolean> = {};

  const spawn: SpawnFunction = (command) => {
    started.push(command);
    const child = createFakeSpawnedProcess();

    child.kill = () => {
      killed[command] = true;
      child.emitClose(null, "SIGTERM");
      return true;
    };

    if (command === "fail") {
      process.nextTick(() => child.emitClose(1, null));
    }
    return child;
  };

  const { store } = await executeChecks(checks, { failFast: true }, spawn);
  const first = store.getCheck(0, 0);
  const second = store.getCheck(0, 1);
  assert.deepEqual(started.sort(), ["fail", "skip"]);
  assert.equal(first.result.status, "failed");
  assert.equal(second.result.status, "aborted");
  assert.equal(killed["skip"], true);
});

test("uses provided spawn function when supplied", async () => {
  const command = `${process.execPath} -e "console.log('should not run')"`;
  let spawnCalled = false;

  const { store } = await executeChecks(
    [{ name: "pty-info", command, cwd: "/tmp/project" }],
    {},
    () => {
      spawnCalled = true;
      const child = createFakeSpawnedProcess();
      process.nextTick(() => child.emitClose(0, null));
      return child;
    },
  );

  const first = store.getCheck(0, 0);
  assert.equal(spawnCalled, true);
  assert.equal(first.result.status, "passed");
});

test("stops immediately when the parent signal is already aborted", async () => {
  const controller = new AbortController();
  controller.abort();
  let spawnCalled = false;

  const { store } = await executeChecks(
    [{ name: "skipped", command: "noop", cwd: "/tmp/project" }],
    {},
    () => {
      spawnCalled = true;
      throw new Error("should not spawn");
    },
    controller,
  );

  const first = store.getCheck(0, 0);
  assert.equal(spawnCalled, false);
  assert.equal(first.result.status, "aborted");
});

test("runs checks from their configured working directory", async () => {
  const cwd = "/tmp/child-project";
  const started: Array<{ command: string; cwd: string | undefined }> = [];

  const spawn: SpawnFunction = (command, workingDir) => {
    started.push({ command, cwd: workingDir });
    const child = createFakeSpawnedProcess();
    process.nextTick(() => child.emitClose(0, null));
    return child;
  };

  const { store } = await executeChecks(
    [{ name: "run-me", command: "echo ok", cwd }],
    {},
    spawn,
  );

  const first = store.getCheck(0, 0);
  assert.equal(first.result.status, "passed");
  assert.deepEqual(started, [{ command: "echo ok", cwd }]);
});
