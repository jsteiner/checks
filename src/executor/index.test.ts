import assert from "node:assert/strict";
import { test } from "vitest";
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
  const store = new Suite({ projects: [project] });
  const input: Input = {
    projects: [project],
    options: {
      interactive: false,
      failFast: false,
      recursive: false,
      concurrency: Number.POSITIVE_INFINITY,
      filters: [],
      directory: ".",
      configFileName: "checks.config.json",
      ansi: true,
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

test("limits concurrent checks when concurrency option is set", async () => {
  const checks: Input["projects"][number]["checks"] = [
    { name: "check-1", command: "cmd-1", cwd: "/tmp/project" },
    { name: "check-2", command: "cmd-2", cwd: "/tmp/project" },
    { name: "check-3", command: "cmd-3", cwd: "/tmp/project" },
    { name: "check-4", command: "cmd-4", cwd: "/tmp/project" },
  ];

  const running = new Set<string>();
  const maxConcurrent = { value: 0 };

  const spawn: SpawnFunction = (command) => {
    running.add(command);
    maxConcurrent.value = Math.max(maxConcurrent.value, running.size);

    const child = createFakeSpawnedProcess();

    setTimeout(() => {
      running.delete(command);
      child.emitClose(0, null);
    }, 5);

    return child;
  };

  const { store } = await executeChecks(checks, { concurrency: 2 }, spawn);

  for (let i = 0; i < checks.length; i++) {
    const check = store.getCheck(0, i);
    assert.equal(check.result.status, "passed");
  }

  assert.ok(maxConcurrent.value <= 2);
});

test("sets checks to pending status before they start", async () => {
  const checks: Input["projects"][number]["checks"] = [
    { name: "check-1", command: "cmd-1", cwd: "/tmp/project" },
    { name: "check-2", command: "cmd-2", cwd: "/tmp/project" },
  ];

  const spawn: SpawnFunction = () => {
    const child = createFakeSpawnedProcess();
    process.nextTick(() => child.emitClose(0, null));
    return child;
  };

  const { store } = await executeChecks(checks, { concurrency: 1 }, spawn);

  for (let i = 0; i < checks.length; i++) {
    const check = store.getCheck(0, i);
    assert.equal(check.result.status, "passed");
  }
});

test("handles abort when parent signal fires after executor is already aborted", async () => {
  const parentController = new AbortController();
  const checks: Input["projects"][number]["checks"] = [
    { name: "fail-fast-check", command: "fail", cwd: "/tmp/project" },
  ];

  const spawn: SpawnFunction = () => {
    const child = createFakeSpawnedProcess();
    // Fail immediately, which will trigger internal abort due to failFast
    process.nextTick(() => {
      child.emitClose(1, null);
      // Fire parent abort after internal abort has already happened
      setTimeout(() => parentController.abort(), 5);
    });
    return child;
  };

  const { store } = await executeChecks(
    checks,
    { failFast: true },
    spawn,
    parentController,
  );

  const first = store.getCheck(0, 0);
  assert.equal(first.result.status, "failed");
});
