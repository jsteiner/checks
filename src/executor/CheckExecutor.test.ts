import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultProjectColor } from "../input/projectColors.js";
import { Project } from "../state/Project.js";
import { createFakeSpawnedProcess } from "../test/helpers/fakeSpawnedProcess.js";
import { DEFAULT_TEST_DIMENSIONS } from "../test/helpers/terminal.js";
import type { CheckDefinition, CheckResult } from "../types.js";
import { CheckExecutor } from "./CheckExecutor.js";
import type { SpawnFunction } from "./PtyProcess.js";

async function executeCheck(
  check: CheckDefinition,
  spawn: SpawnFunction = () => createFakeSpawnedProcess(),
  controller: AbortController = new AbortController(),
) {
  const store = new Project(
    {
      project: "config",
      path: "/tmp/checks.config.json",
      color: getDefaultProjectColor(0),
      checks: [check],
    },
    0,
    Date.now(),
  );
  const executor = new CheckExecutor(
    controller.signal,
    DEFAULT_TEST_DIMENSIONS,
    spawn,
  );
  const target = store.getCheck(0);

  const status = await executor.run(target);

  return { controller, store, executor, status };
}

function expectFailed(result: CheckResult) {
  if (result.status !== "failed") {
    throw new Error(`Expected failed result, received ${result.status}`);
  }
  return result;
}

test("returns aborted immediately when the signal is already aborted", async () => {
  const controller = new AbortController();
  controller.abort();
  let spawnCalled = false;

  const { store, status } = await executeCheck(
    { name: "aborted", command: "noop", cwd: "/tmp/project" },
    () => {
      spawnCalled = true;
      throw new Error("should not spawn");
    },
    controller,
  );
  const first = store.getCheck(0);

  assert.equal(status, "aborted");
  assert.equal(spawnCalled, false);
  assert.equal(first.result.status, "aborted");
});

test("marks passed when the child exits with code 0", async () => {
  const spawn = () => {
    const child = createFakeSpawnedProcess();
    process.nextTick(() => child.emitClose(0, null));
    return child;
  };

  const { store, status } = await executeCheck(
    { name: "success", command: "noop", cwd: "/tmp/project" },
    spawn,
  );
  const first = store.getCheck(0);

  assert.equal(status, "passed");
  assert.equal(first.result.status, "passed");
  assert.equal(first.result.exitCode, 0);
});

test("marks failed when the child exits with a non-zero code", async () => {
  const spawn = () => {
    const child = createFakeSpawnedProcess();
    process.nextTick(() => child.emitClose(2, null));
    return child;
  };

  const { store, status } = await executeCheck(
    { name: "fail", command: "noop", cwd: "/tmp/project" },
    spawn,
  );
  const first = store.getCheck(0);

  assert.equal(status, "failed");
  assert.equal(first.result.status, "failed");
  assert.equal(first.result.exitCode, 2);
});

test("records spawn errors and fallback error messages", async () => {
  const { store, status } = await executeCheck(
    { name: "spawn-error", command: "noop", cwd: "/tmp/project" },
    () => {
      throw new Error("spawn failed");
    },
  );
  const first = store.getCheck(0);

  assert.equal(status, "failed");
  const result = expectFailed(first.result);
  assert.equal(result.errorMessage, "spawn failed");
  assert.equal(first.output, ""); // No output for spawn errors

  const { store: fallbackStore, status: fallbackStatus } = await executeCheck(
    { name: "non-error", command: "noop", cwd: "/tmp/project" },
    () => {
      throw "not-an-error";
    },
  );
  const fallbackFirst = fallbackStore.getCheck(0);

  assert.equal(fallbackStatus, "failed");
  const fallbackResult = expectFailed(fallbackFirst.result);
  assert.equal(fallbackResult.errorMessage, "Spawn failed");
  assert.equal(fallbackFirst.output, ""); // No output for spawn errors
});

test("captures child error events and marks the check failed", async () => {
  const spawn = () => {
    const child = createFakeSpawnedProcess();
    process.nextTick(() => {
      child.emit("error", new Error("child blew up"));
    });
    return child;
  };

  const { store, status } = await executeCheck(
    { name: "child-error", command: "noop", cwd: "/tmp/project" },
    spawn,
  );
  // Wait for async output processing
  await new Promise((resolve) => setTimeout(resolve, 10));
  const first = store.getCheck(0);

  assert.equal(status, "failed");
  const result = expectFailed(first.result);
  assert.equal(result.errorMessage, "child blew up");
  // OutputManager processes the error message through the buffer
  assert.ok(first.output.includes("child blew up"));
});

test("aborts a running check when the abort signal fires", async () => {
  const controller = new AbortController();
  let killed = false;

  const spawn = () => {
    const child = createFakeSpawnedProcess();
    child.kill = () => {
      killed = true;
      child.emitClose(null, "SIGTERM");
      return true;
    };
    return child;
  };

  const promise = executeCheck(
    { name: "abort", command: "noop", cwd: "/tmp/project" },
    spawn,
    controller,
  );
  controller.abort();
  const { store, status } = await promise;
  const first = store.getCheck(0);

  assert.equal(status, "aborted");
  assert.equal(first.result.status, "aborted");
  assert.equal(killed, true);
});

test("marks aborted when the child closes with a signal", async () => {
  const spawn = () => {
    const child = createFakeSpawnedProcess();
    process.nextTick(() => child.emitClose(null, "SIGTERM"));
    return child;
  };

  const { store, status } = await executeCheck(
    { name: "signal-close", command: "noop", cwd: "/tmp/project" },
    spawn,
  );
  const first = store.getCheck(0);

  assert.equal(status, "aborted");
  assert.equal(first.result.status, "aborted");
});

test("skips killing when the child is already marked killed", async () => {
  const controller = new AbortController();
  let killCalled = false;

  const spawn = () => {
    const child = createFakeSpawnedProcess({ killed: true });
    child.kill = () => {
      killCalled = true;
      child.emitClose(null, "SIGTERM");
      return true;
    };
    process.nextTick(() => child.emitClose(null, "SIGTERM"));
    return child;
  };

  const promise = executeCheck(
    { name: "already-killed", command: "noop", cwd: "/tmp/project" },
    spawn,
    controller,
  );
  controller.abort();
  const { status } = await promise;

  assert.equal(status, "aborted");
  assert.equal(killCalled, false);
});
