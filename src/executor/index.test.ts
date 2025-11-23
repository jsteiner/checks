import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { Input } from "../input/index.js";
import { ChecksStore } from "../state/ChecksStore.js";
import { Executor, type ExecutorOptions } from "./index.js";

type RunSetupParams = {
  checks: Input["config"]["checks"];
  options?: Partial<Input["options"]>;
  environment?: Input["environment"] & Record<string, string>;
  controller?: AbortController;
};

function createRunSetup(params: RunSetupParams) {
  const checks = params.checks;
  const store = new ChecksStore(checks, Date.now());
  const controller = params.controller ?? new AbortController();
  const input: Input = {
    config: { checks },
    options: {
      interactive: false,
      failFast: false,
      ...params.options,
    },
    environment: {
      FORCE_COLOR: "1",
      ...params.environment,
    },
  };
  return { controller, input, store };
}

type RunChecksParams = RunSetupParams & {
  executorOptions?: ExecutorOptions;
};

async function runChecksWithDefaults(params: RunChecksParams) {
  const { controller, input, store } = createRunSetup(params);
  const executor = new Executor(
    input,
    store,
    controller.signal,
    params.executorOptions,
  );
  await executor.run();
  return { controller, input, store };
}

test("aborts other running checks after the first failure when fail-fast is enabled", async () => {
  const checks: Input["config"]["checks"] = [
    { name: "fail", command: "fail" },
    { name: "skip", command: "skip" },
  ];
  const started: string[] = [];
  const killed: Record<string, boolean> = {};

  const spawn = (command: string) => {
    started.push(command);
    const child = new EventEmitter() as EventEmitter & Partial<ChildProcess>;
    let closed = false;

    const close = (code: number | null, signalCode: NodeJS.Signals | null) => {
      if (closed) return;
      closed = true;
      child.emit("close", code, signalCode);
    };

    child.kill = () => {
      killed[command] = true;
      close(null, "SIGTERM");
      return true;
    };

    if (command === "fail") {
      process.nextTick(() => close(1, null));
    }
    return child as ChildProcess;
  };

  const { store } = await runChecksWithDefaults({
    checks,
    options: { failFast: true },
    executorOptions: { spawn },
  });

  const [first, second] = store.getSnapshot();
  assert.deepEqual(started.sort(), ["fail", "skip"]);
  assert.ok(first && second);
  assert.equal(first.result.status, "failed");
  assert.equal(second.result.status, "aborted");
  assert.equal(killed["skip"], true);
});

test("forces color support for spawned commands", async () => {
  const command = `${process.execPath} -e "console.log(process.env.FORCE_COLOR ?? 'missing')"`;
  const { store } = await runChecksWithDefaults({
    checks: [{ name: "env", command }],
    environment: { FORCE_COLOR: "color" },
  });

  const first = store.getSnapshot()[0];
  assert.ok(first);
  assert.deepEqual(first.log, [{ stream: "stdout", text: "color\n" }]);
});

test("passes environment variables to spawned commands", async () => {
  const command = `${process.execPath} -e "console.log(process.env.MY_VAR ?? 'missing')"`;
  const { store } = await runChecksWithDefaults({
    checks: [{ name: "env", command }],
    environment: { FORCE_COLOR: "1", MY_VAR: "hello-world" },
  });

  const first = store.getSnapshot()[0];
  assert.ok(first);
  assert.deepEqual(first.log, [{ stream: "stdout", text: "hello-world\n" }]);
});
