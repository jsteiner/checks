import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { render } from "ink-testing-library";
import { Executor } from "./executor/index.js";
import type { Input } from "./input/index.js";
import { getDefaultProjectColor } from "./input/projectColors.js";
import { Suite } from "./state/Suite.js";
import { stripAnsi } from "./test/helpers/ui.js";
import { App } from "./ui/App.js";

test("runs commands in parallel and renders updates", async () => {
  const definitions = [
    {
      name: "fast",
      command: `${process.execPath} -e "console.log('alpha')"`,
    },
    {
      name: "slow-fail",
      command: `${process.execPath} -e "setTimeout(() => { console.error('bravo'); process.exit(1); }, 25)"`,
    },
  ];

  const project = {
    project: "integration",
    path: "/tmp/checks.config.json",
    color: getDefaultProjectColor(0),
    checks: definitions,
  };

  const store = new Suite({ projects: [project] }, Date.now());
  const controller = new AbortController();
  const input: Input = {
    projects: [project],
    options: { interactive: false, failFast: false, recursive: false },
  };
  const ink = render(
    <App
      store={store}
      interactive={input.options.interactive}
      abortSignal={controller.signal}
      onAbort={() => controller.abort()}
    />,
  );

  const runPromise = new Executor(input, store, controller.signal).run();
  await delay(5);

  const inProgressFrame = ink.lastFrame() ?? "";
  assert.match(inProgressFrame, /running/);

  await runPromise;
  await store.waitForCompletion();
  await delay(10);

  const finalFrame = stripAnsi(ink.lastFrame() ?? "");
  assert.match(finalFrame, /integration/);
  assert.match(finalFrame, /1 passed.*1 failed.*0 aborted/);
  assert.match(finalFrame, /passed/);
  assert.match(finalFrame, /failed/);
  assert.match(finalFrame, /bravo/);
});
