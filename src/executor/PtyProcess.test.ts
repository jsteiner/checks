import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mock, test } from "node:test";
import type { IPty } from "node-pty";
import { PtyProcess } from "./PtyProcess.js";

type StdoutStub = EventEmitter & {
  columns?: number;
  rows?: number;
  isTTY?: boolean;
};

type ProcessStub = {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  cwd: () => string;
  kill: (pid: number, signal?: NodeJS.Signals) => boolean;
  stdout: StdoutStub;
};

function createProcessStub(overrides: Partial<ProcessStub> = {}): ProcessStub {
  const stdoutEmitter = overrides.stdout ?? (new EventEmitter() as StdoutStub);
  Object.assign(stdoutEmitter, {
    columns: 80,
    rows: 24,
    isTTY: true,
    ...overrides.stdout,
  });

  const stub: ProcessStub = {
    platform: "linux",
    env: {},
    cwd: () => "/tmp/project",
    kill: () => true,
    stdout: stdoutEmitter,
    ...overrides,
  };

  return stub;
}

function createFakePty(pid = 1234) {
  const dataListeners = new Set<(data: string) => void>();
  const exitListeners = new Set<
    (payload: { exitCode?: number | null; signal?: number | null }) => void
  >();
  const killCalls: Array<NodeJS.Signals | undefined> = [];
  const resizeCalls: Array<{ cols: number; rows: number }> = [];

  const pty = {
    pid,
    onData: (handler: (data: string) => void) => {
      dataListeners.add(handler);
      return { dispose: () => dataListeners.delete(handler) };
    },
    onExit: (
      handler: (payload: {
        exitCode?: number | null;
        signal?: number | null;
      }) => void,
    ) => {
      exitListeners.add(handler);
      return { dispose: () => exitListeners.delete(handler) };
    },
    kill: (signal?: NodeJS.Signals) => {
      killCalls.push(signal);
    },
    resize: (cols: number, rows: number) => {
      resizeCalls.push({ cols, rows });
    },
    write() {
      return;
    },
    pause() {
      return;
    },
    resume() {
      return;
    },
    destroy() {
      return;
    },
    emitData(data: string) {
      dataListeners.forEach((handler) => {
        handler(data);
      });
    },
    emitExit(exitCode?: number | null, signal?: number | null) {
      const payload = {
        exitCode: exitCode ?? null,
        signal: signal ?? null,
      };
      exitListeners.forEach((handler) => {
        handler(payload);
      });
    },
    killCalls,
    resizeCalls,
  } as unknown as IPty & {
    emitData: (data: string) => void;
    emitExit: (exitCode?: number | null, signal?: number | null) => void;
    killCalls: Array<NodeJS.Signals | undefined>;
    resizeCalls: Array<{ cols: number; rows: number }>;
  };

  return pty;
}

test("spawns with provided env and process settings", async () => {
  const env = { SHELL: "/bin/zsh", MY_VAR: "value" };
  const processStub = createProcessStub({
    env,
    cwd: () => "/custom/cwd",
    stdout: Object.assign(new EventEmitter(), {
      columns: 120,
      rows: 40,
      isTTY: false,
    }),
  });
  const fakePty = createFakePty(999);

  const spawn = mock.fn((file, args, options) => {
    assert.equal(file, "/bin/zsh");
    assert.deepEqual(args, ["-c", "echo hi"]);
    assert.deepEqual(options, {
      cols: 120,
      rows: 40,
      cwd: "/custom/cwd",
      env,
    });
    return fakePty;
  });

  const child = new PtyProcess({ process: processStub, spawn }).spawn(
    "echo hi",
  );

  let output = "";
  child.stdout?.on("data", (chunk) => {
    output += chunk.toString();
  });

  const closeEventPromise = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) => {
    child.on("close", (code, signal) => resolve({ code, signal }));
  });

  fakePty.emitData("hello");
  fakePty.emitExit(0, null);

  assert.equal(child.pid, 999);
  assert.equal(output, "hello");
  assert.equal(spawn.mock.callCount(), 1);

  const closeEvent = await closeEventPromise;
  assert.deepEqual(closeEvent, { code: 0, signal: null });
});

test("uses shell env var for spawn", () => {
  const env = { SHELL: "/bin/zsh" };
  const processStub = createProcessStub({ env });
  const fakePty = createFakePty();
  const spawn = mock.fn((file, args) => {
    assert.equal(file, env.SHELL);
    assert.deepEqual(args, ["-c", "dir"]);
    return fakePty;
  });

  new PtyProcess({ process: processStub, spawn }).spawn("dir");
  assert.equal(spawn.mock.callCount(), 1);
});

test("kills the process group when possible and records the signal", async () => {
  const killCalls: Array<{ pid: number; signal: NodeJS.Signals }> = [];
  const processStub = createProcessStub({
    kill: (pid: number, signal?: NodeJS.Signals) => {
      if (signal === undefined) throw new Error("signal is required");
      killCalls.push({ pid, signal });
      return true;
    },
  });
  const fakePty = createFakePty(4321);
  const child = new PtyProcess({
    process: processStub,
    spawn: () => fakePty,
  }).spawn("noop");

  const closeEventPromise = new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>((resolve) =>
    child.on("close", (code, signal) => resolve({ code, signal })),
  );

  child.kill("SIGTERM");
  fakePty.emitExit(0, null);

  assert.deepEqual(killCalls, [{ pid: -4321, signal: "SIGTERM" }]);
  assert.deepEqual(await closeEventPromise, { code: 0, signal: "SIGTERM" });
  assert.deepEqual(fakePty.killCalls, []);
});

test("falls back to PTY kill when group kill fails", async () => {
  const processStub = createProcessStub({
    kill: () => {
      throw new Error("fail");
    },
  });
  const fakePty = createFakePty(2468);
  const child = new PtyProcess({
    process: processStub,
    spawn: () => fakePty,
  }).spawn("noop");

  child.kill("SIGKILL");
  fakePty.emitExit(0, null);

  assert.deepEqual(fakePty.killCalls, ["SIGKILL"]);
});

test("syncs PTY size with stdout when resize events occur", () => {
  const stdout = Object.assign(new EventEmitter(), {
    isTTY: true,
    columns: 10,
    rows: 5,
  });
  const processStub = createProcessStub({ stdout });
  const fakePty = createFakePty();
  new PtyProcess({ process: processStub, spawn: () => fakePty }).spawn("noop");

  stdout.columns = 20;
  stdout.rows = 7;
  stdout.emit("resize");

  assert.deepEqual(fakePty.resizeCalls, [{ cols: 20, rows: 7 }]);
});
