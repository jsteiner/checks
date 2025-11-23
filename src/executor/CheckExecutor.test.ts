import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import test from "node:test";
import { ChecksStore } from "../state/ChecksStore.js";
import type { CheckResult } from "../types.js";
import { CheckExecutor } from "./CheckExecutor.js";
import type { SpawnFunction } from "./index.js";

type KillRecord = { pid: number; signal?: NodeJS.Signals | number };
type FakeChild = EventEmitter & Partial<ChildProcess>;

function createRunnerContext(params?: {
  spawn?: SpawnFunction;
  process?: Pick<NodeJS.Process, "kill" | "platform">;
  controller?: AbortController;
}) {
  const controller = params?.controller ?? new AbortController();
  const store = new ChecksStore(
    [{ name: "check", command: "cmd" }],
    Date.now(),
  );
  const runner = new CheckExecutor(
    store,
    controller.signal,
    params?.spawn ?? (() => new EventEmitter() as ChildProcess),
    params?.process ?? process,
  );
  return { controller, store, runner };
}

function createProcessStub() {
  const kills: KillRecord[] = [];
  let lastChild: FakeChild | undefined;

  const processStub: Pick<NodeJS.Process, "kill" | "platform"> = {
    platform: process.platform,
    kill: (pid: number, signal?: NodeJS.Signals | number) => {
      if (!lastChild) {
        throw new Error("No child process registered for kill");
      }
      kills.push(signal === undefined ? { pid } : { pid, signal });
      lastChild?.emit("close", null, signal ?? null);
      return true;
    },
  };

  return {
    processStub,
    kills,
    setChild(child: FakeChild) {
      lastChild = child;
    },
  };
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

  const { store, runner } = createRunnerContext({
    controller,
    spawn: () => {
      spawnCalled = true;
      throw new Error("should not spawn");
    },
  });

  const status = await runner.run({ name: "aborted", command: "noop" }, 0);
  const first = store.getSnapshot()[0];

  assert.equal(status, "aborted");
  assert.equal(spawnCalled, false);
  assert.ok(first);
  assert.equal(first.result.status, "aborted");
});

test("marks passed when the child exits with code 0", async () => {
  const spawn = () => {
    const child = new EventEmitter() as FakeChild;
    process.nextTick(() => child.emit("close", 0, null));
    return child as ChildProcess;
  };

  const { store, runner } = createRunnerContext({ spawn });
  const status = await runner.run({ name: "success", command: "noop" }, 0);
  const first = store.getSnapshot()[0];

  assert.equal(status, "passed");
  assert.ok(first);
  assert.equal(first.result.status, "passed");
  assert.equal(first.result.exitCode, 0);
});

test("marks failed when the child exits with a non-zero code", async () => {
  const spawn = () => {
    const child = new EventEmitter() as FakeChild;
    process.nextTick(() => child.emit("close", 2, null));
    return child as ChildProcess;
  };

  const { store, runner } = createRunnerContext({ spawn });
  const status = await runner.run({ name: "fail", command: "noop" }, 0);
  const first = store.getSnapshot()[0];

  assert.equal(status, "failed");
  assert.ok(first);
  assert.equal(first.result.status, "failed");
  assert.equal(first.result.exitCode, 2);
});

test("records spawn errors and fallback error messages", async () => {
  const { store, runner } = createRunnerContext({
    spawn: () => {
      throw new Error("spawn failed");
    },
  });
  const status = await runner.run({ name: "spawn-error", command: "noop" }, 0);
  const first = store.getSnapshot()[0];

  assert.equal(status, "failed");
  assert.ok(first);
  const result = expectFailed(first.result);
  assert.equal(result.errorMessage, "spawn failed");
  assert.deepEqual(first.log, [{ stream: "stderr", text: "spawn failed\n" }]);

  const { store: fallbackStore, runner: fallbackRunner } = createRunnerContext({
    spawn: () => {
      throw "not-an-error";
    },
  });
  const fallbackStatus = await fallbackRunner.run(
    { name: "non-error", command: "noop" },
    0,
  );
  const fallbackFirst = fallbackStore.getSnapshot()[0];

  assert.equal(fallbackStatus, "failed");
  assert.ok(fallbackFirst);
  const fallbackResult = expectFailed(fallbackFirst.result);
  assert.equal(fallbackResult.errorMessage, "Spawn failed");
  assert.deepEqual(fallbackFirst.log, [
    { stream: "stderr", text: "Spawn failed\n" },
  ]);
});

test("aborts a running check when the abort signal fires", async () => {
  const controller = new AbortController();
  let killed = false;

  const spawn = () => {
    const child = new EventEmitter() as FakeChild;
    child.kill = () => {
      killed = true;
      child.emit("close", null, "SIGTERM");
      return true;
    };
    return child as ChildProcess;
  };

  const { store, runner } = createRunnerContext({ spawn, controller });
  const promise = runner.run({ name: "abort", command: "noop" }, 0);
  controller.abort();
  const status = await promise;
  const first = store.getSnapshot()[0];

  assert.equal(status, "aborted");
  assert.ok(first);
  assert.equal(first.result.status, "aborted");
  assert.equal(killed, true);
});

test("marks aborted when the child closes with a signal", async () => {
  const spawn = () => {
    const child = new EventEmitter() as FakeChild;
    process.nextTick(() => child.emit("close", null, "SIGTERM"));
    return child as ChildProcess;
  };

  const { store, runner } = createRunnerContext({ spawn });
  const status = await runner.run({ name: "signal-close", command: "noop" }, 0);
  const first = store.getSnapshot()[0];

  assert.equal(status, "aborted");
  assert.ok(first);
  assert.equal(first.result.status, "aborted");
});

test("kills the process group when a pid is present", async () => {
  const controller = new AbortController();
  const { processStub, kills, setChild } = createProcessStub();

  const spawn = () => {
    const child = new EventEmitter() as FakeChild;
    setChild(child);
    Object.defineProperty(child, "pid", { value: 1234 });
    child.kill = () => {
      kills.push({ pid: 1234, signal: "SIGTERM" });
      child.emit("close", null, "SIGTERM");
      return true;
    };
    return child as ChildProcess;
  };

  const { store, runner } = createRunnerContext({
    spawn,
    process: processStub,
    controller,
  });

  const promise = runner.run({ name: "group-kill", command: "noop" }, 0);
  controller.abort();
  const status = await promise;
  const first = store.getSnapshot()[0];

  assert.equal(status, "aborted");
  assert.ok(first);
  assert.deepEqual(
    kills.map((entry) => ({ ...entry, pid: Math.trunc(entry.pid) })),
    [{ pid: -1234, signal: "SIGTERM" }],
  );
});

test("falls back to child.kill when process group killing is skipped", async () => {
  const controller = new AbortController();
  let killed = false;

  const spawn = () => {
    const child = new EventEmitter() as FakeChild;
    Object.defineProperty(child, "pid", { value: 4321 });
    child.kill = () => {
      killed = true;
      child.emit("close", null, "SIGTERM");
      return true;
    };
    return child as ChildProcess;
  };

  const { store, runner } = createRunnerContext({
    spawn,
    process: { platform: "win32", kill: () => true },
    controller,
  });

  const promise = runner.run({ name: "win32", command: "noop" }, 0);
  controller.abort();
  const status = await promise;
  const first = store.getSnapshot()[0];

  assert.equal(status, "aborted");
  assert.ok(first);
  assert.equal(killed, true);
});
