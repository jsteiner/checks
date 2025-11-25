import assert from "node:assert/strict";
import test from "node:test";
import { Project } from "../state/Project.js";
import { createFakeSpawnedProcess } from "../test/helpers/fakeSpawnedProcess.js";
import type { CheckDefinition, CheckResult } from "../types.js";
import { CheckExecutor } from "./CheckExecutor.js";
import type { SpawnFunction } from "./PtyProcess.js";

async function executeCheck(
  check: CheckDefinition,
  spawn: SpawnFunction = () => createFakeSpawnedProcess(),
  controller: AbortController = new AbortController(),
) {
  const store = new Project(
    { project: "config", path: "/tmp/checks.config.json", checks: [check] },
    0,
    Date.now(),
  );
  const executor = new CheckExecutor(controller.signal, spawn);
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
    { name: "aborted", command: "noop" },
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
    { name: "success", command: "noop" },
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
    { name: "fail", command: "noop" },
    spawn,
  );
  const first = store.getCheck(0);

  assert.equal(status, "failed");
  assert.equal(first.result.status, "failed");
  assert.equal(first.result.exitCode, 2);
});

test("records spawn errors and fallback error messages", async () => {
  const { store, status } = await executeCheck(
    { name: "spawn-error", command: "noop" },
    () => {
      throw new Error("spawn failed");
    },
  );
  const first = store.getCheck(0);

  assert.equal(status, "failed");
  const result = expectFailed(first.result);
  assert.equal(result.errorMessage, "spawn failed");
  assert.deepEqual(first.log, [{ text: "spawn failed\n" }]);

  const { store: fallbackStore, status: fallbackStatus } = await executeCheck(
    { name: "non-error", command: "noop" },
    () => {
      throw "not-an-error";
    },
  );
  const fallbackFirst = fallbackStore.getCheck(0);

  assert.equal(fallbackStatus, "failed");
  const fallbackResult = expectFailed(fallbackFirst.result);
  assert.equal(fallbackResult.errorMessage, "Spawn failed");
  assert.deepEqual(fallbackFirst.log, [{ text: "Spawn failed\n" }]);
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
    { name: "abort", command: "noop" },
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
    { name: "signal-close", command: "noop" },
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
    { name: "already-killed", command: "noop" },
    spawn,
    controller,
  );
  controller.abort();
  const { status } = await promise;

  assert.equal(status, "aborted");
  assert.equal(killCalled, false);
});
