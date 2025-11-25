import assert from "node:assert/strict";
import test from "node:test";
import { ChecksStore } from "../state/ChecksStore.js";
import { createFakeSpawnedProcess } from "../test/helpers/fakeSpawnedProcess.js";
import type { CheckDefinition, CheckResult } from "../types.js";
import { CheckExecutor } from "./CheckExecutor.js";
import type { SpawnFunction } from "./PtyProcess.js";

async function executeCheck(
  check: CheckDefinition,
  index: number = 0,
  spawn: SpawnFunction = () => createFakeSpawnedProcess(),
  controller: AbortController = new AbortController(),
) {
  const store = new ChecksStore(
    [{ name: "check", command: "cmd" }],
    Date.now(),
  );
  const executor = new CheckExecutor(store, controller.signal, spawn);

  const status = await executor.run(check, index);

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
    0,
    () => {
      spawnCalled = true;
      throw new Error("should not spawn");
    },
    controller,
  );
  const first = store.getSnapshot()[0];

  assert.equal(status, "aborted");
  assert.equal(spawnCalled, false);
  assert.ok(first);
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
    0,
    spawn,
  );
  const first = store.getSnapshot()[0];

  assert.equal(status, "passed");
  assert.ok(first);
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
    0,
    spawn,
  );
  const first = store.getSnapshot()[0];

  assert.equal(status, "failed");
  assert.ok(first);
  assert.equal(first.result.status, "failed");
  assert.equal(first.result.exitCode, 2);
});

test("records spawn errors and fallback error messages", async () => {
  const { store, status } = await executeCheck(
    { name: "spawn-error", command: "noop" },
    0,
    () => {
      throw new Error("spawn failed");
    },
  );
  const first = store.getSnapshot()[0];

  assert.equal(status, "failed");
  assert.ok(first);
  const result = expectFailed(first.result);
  assert.equal(result.errorMessage, "spawn failed");
  assert.deepEqual(first.log, [{ text: "spawn failed\n" }]);

  const { store: fallbackStore, status: fallbackStatus } = await executeCheck(
    { name: "non-error", command: "noop" },
    0,
    () => {
      throw "not-an-error";
    },
  );
  const fallbackFirst = fallbackStore.getSnapshot()[0];

  assert.equal(fallbackStatus, "failed");
  assert.ok(fallbackFirst);
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
    0,
    spawn,
    controller,
  );
  controller.abort();
  const { store, status } = await promise;
  const first = store.getSnapshot()[0];

  assert.equal(status, "aborted");
  assert.ok(first);
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
    0,
    spawn,
  );
  const first = store.getSnapshot()[0];

  assert.equal(status, "aborted");
  assert.ok(first);
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
    0,
    spawn,
    controller,
  );
  controller.abort();
  const { store, status } = await promise;
  const first = store.getSnapshot()[0];

  assert.equal(status, "aborted");
  assert.ok(first);
  assert.equal(killCalled, false);
});
