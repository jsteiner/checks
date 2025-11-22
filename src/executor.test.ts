import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { formatLog } from "./display.js";
import { runChecks } from "./executor.js";
import { ChecksStore } from "./state/ChecksStore.js";

test("marks successful commands as passed", async () => {
  const command = `${process.execPath} -e "process.exit(0)"`;
  const store = new ChecksStore([{ name: "success", command }], Date.now());
  const controller = new AbortController();

  await runChecks([{ name: "success", command }], store, controller.signal);
  const snapshot = store.getSnapshot();
  const first = snapshot[0];
  assert.ok(first);
  assert.equal(first.result.status, "passed");
  assert.equal(first.result.exitCode, 0);
});

test("marks failing commands as failed", async () => {
  const command = `${process.execPath} -e "console.error('fail'); process.exit(1)"`;
  const store = new ChecksStore([{ name: "fail", command }], Date.now());
  const controller = new AbortController();

  await runChecks([{ name: "fail", command }], store, controller.signal);
  const snapshot = store.getSnapshot();
  const first = snapshot[0];
  assert.ok(first);
  assert.equal(first.result.status, "failed");
  assert.equal(first.result.exitCode, 1);
  assert.match(formatLog(first.log, { stream: "stderr" }), /fail/);
  assert.equal(first.result.errorMessage, null);
});

test("handles spawn errors by marking the check as failed", async () => {
  const store = new ChecksStore(
    [{ name: "spawn-error", command: "does-not-matter" }],
    Date.now(),
  );
  const controller = new AbortController();

  await runChecks(
    [{ name: "spawn-error", command: "does-not-matter" }],
    store,
    controller.signal,
    {
      spawn: () => {
        throw new Error("spawn failed");
      },
    },
  );

  const snapshot = store.getSnapshot();
  const first = snapshot[0];
  assert.ok(first);
  assert.equal(first.result.status, "failed");
  assert.match(formatLog(first.log, { stream: "stderr" }), /spawn failed/);
  assert.equal(first.result.errorMessage, "spawn failed");
});

test("handles non-Error spawn throw with a fallback message", async () => {
  const store = new ChecksStore(
    [{ name: "non-error-spawn", command: "irrelevant" }],
    Date.now(),
  );
  const controller = new AbortController();

  await runChecks(
    [{ name: "non-error-spawn", command: "irrelevant" }],
    store,
    controller.signal,
    {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      spawn: () => {
        throw "not-an-error";
      },
    },
  );

  const first = store.getSnapshot()[0];
  assert.ok(first);
  assert.equal(first.result.status, "failed");
  assert.equal(first.result.errorMessage, "Spawn failed");
  assert.match(formatLog(first.log, { stream: "stderr" }), /Spawn failed/);
});

test("marks checks as aborted when signal is already aborted", async () => {
  const command = `${process.execPath} -e "process.exit(0)"`;
  const store = new ChecksStore([{ name: "aborted", command }], Date.now());
  const controller = new AbortController();
  controller.abort();

  let spawnCalled = false;
  await runChecks([{ name: "aborted", command }], store, controller.signal, {
    spawn: () => {
      spawnCalled = true;
      throw new Error("should not spawn when aborted");
    },
  });

  const first = store.getSnapshot()[0];
  assert.equal(spawnCalled, false);
  assert.ok(first);
  assert.equal(first.result.status, "aborted");
});

test("aborts running checks when the signal fires", async () => {
  const store = new ChecksStore(
    [{ name: "abort-running", command: "irrelevant" }],
    Date.now(),
  );
  const controller = new AbortController();

  let killed = false;
  const spawn = () => {
    const child = new EventEmitter() as EventEmitter &
      Partial<import("node:child_process").ChildProcess>;
    child.kill = () => {
      killed = true;
      child.emit("close", null, "SIGTERM");
      return true;
    };
    return child as import("node:child_process").ChildProcess;
  };

  const promise = runChecks(
    [{ name: "abort-running", command: "irrelevant" }],
    store,
    controller.signal,
    { spawn },
  );

  controller.abort();
  await promise;

  const first = store.getSnapshot()[0];
  assert.ok(first);
  assert.equal(first.result.status, "aborted");
  assert.equal(killed, true);
});

test("marks checks aborted when the process exits from a signal", async () => {
  const store = new ChecksStore(
    [{ name: "signal-close", command: "irrelevant" }],
    Date.now(),
  );
  const controller = new AbortController();

  const spawn = () => {
    const child = new EventEmitter() as EventEmitter &
      Partial<import("node:child_process").ChildProcess>;
    process.nextTick(() => child.emit("close", null, "SIGTERM"));
    return child as import("node:child_process").ChildProcess;
  };

  await runChecks(
    [{ name: "signal-close", command: "irrelevant" }],
    store,
    controller.signal,
    { spawn },
  );

  const first = store.getSnapshot()[0];
  assert.ok(first);
  assert.equal(first.result.status, "aborted");
});

test("forces color support for spawned commands", async () => {
  const originalForceColor = process.env["FORCE_COLOR"];
  delete process.env["FORCE_COLOR"];

  try {
    const command = `${process.execPath} -e "console.log(process.env.FORCE_COLOR ?? 'missing')"`;
    const store = new ChecksStore([{ name: "color", command }], Date.now());
    const controller = new AbortController();

    await runChecks([{ name: "color", command }], store, controller.signal);
    const first = store.getSnapshot()[0];
    assert.ok(first);
    assert.equal(formatLog(first.log, { stream: "stdout" }).trim(), "1");
  } finally {
    if (originalForceColor === undefined) {
      delete process.env["FORCE_COLOR"];
    } else {
      process.env["FORCE_COLOR"] = originalForceColor;
    }
  }
});
