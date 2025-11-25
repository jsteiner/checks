import assert from "node:assert/strict";
import test from "node:test";
import type { Input } from "../input/index.js";
import { ChecksStore } from "../state/ChecksStore.js";
import { createFakeSpawnedProcess } from "../test/helpers/fakeSpawnedProcess.js";
import { Executor } from "./index.js";
import { createDefaultSpawner, type SpawnFunction } from "./PtyProcess.js";

async function executeChecks(
  checks: Input["config"]["checks"],
  options: Partial<Input["options"]> = {},
  spawn: SpawnFunction = createDefaultSpawner(),
  controller: AbortController = new AbortController(),
) {
  const store = new ChecksStore(checks, Date.now());
  const input: Input = {
    config: { checks },
    options: {
      interactive: false,
      failFast: false,
      ...options,
    },
  };

  const executor = new Executor(input, store, controller.signal, spawn);
  await executor.run();

  return { controller, input, store, executor };
}

test("aborts other running checks after the first failure when fail-fast is enabled", async () => {
  const checks: Input["config"]["checks"] = [
    { name: "fail", command: "fail" },
    { name: "skip", command: "skip" },
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

  const [first, second] = store.getSnapshot();
  assert.deepEqual(started.sort(), ["fail", "skip"]);
  assert.ok(first && second);
  assert.equal(first.result.status, "failed");
  assert.equal(second.result.status, "aborted");
  assert.equal(killed["skip"], true);
});

test("uses provided spawn function when supplied", async () => {
  const command = `${process.execPath} -e "console.log('should not run')"`;
  let spawnCalled = false;

  const { store } = await executeChecks(
    [{ name: "pty-info", command }],
    {},
    () => {
      spawnCalled = true;
      const child = createFakeSpawnedProcess();
      process.nextTick(() => child.emitClose(0, null));
      return child;
    },
  );

  const first = store.getSnapshot()[0];
  assert.ok(first);
  assert.equal(spawnCalled, true);
});

test("stops immediately when the parent signal is already aborted", async () => {
  const controller = new AbortController();
  controller.abort();
  let spawnCalled = false;

  const { store } = await executeChecks(
    [{ name: "skipped", command: "noop" }],
    {},
    () => {
      spawnCalled = true;
      throw new Error("should not spawn");
    },
    controller,
  );

  const first = store.getSnapshot()[0];
  assert.equal(spawnCalled, false);
  assert.ok(first);
  assert.equal(first.result.status, "aborted");
});
