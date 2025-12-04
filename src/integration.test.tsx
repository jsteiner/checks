import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { render } from "ink-testing-library";
import { test } from "vitest";
import { Executor } from "./executor/index.js";
import type { Input } from "./input/index.js";
import { getProjectColor } from "./input/projectColors.js";
import { Suite } from "./state/Suite.js";
import { DEFAULT_TEST_DIMENSIONS } from "./test/helpers/terminal.js";
import { stripAnsi } from "./test/helpers/ui.jsx";
import { App } from "./ui/App.js";

test("runs commands in parallel and renders updates", async () => {
  const definitions = [
    {
      name: "fast",
      command: `${process.execPath} -e "console.log('alpha')"`,
      cwd: process.cwd(),
    },
    {
      name: "slow-fail",
      command: `${process.execPath} -e "setTimeout(() => { console.error('bravo'); process.exit(1); }, 25)"`,
      cwd: process.cwd(),
    },
  ];

  const project = {
    project: "integration",
    path: "/tmp/checks.config.json",
    color: getProjectColor(0),
    checks: definitions,
  };

  const store = new Suite({ projects: [project] });
  const controller = new AbortController();
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
    },
  };
  const ink = render(
    <App
      store={store}
      interactive={input.options.interactive}
      abortSignal={controller.signal}
      onAbort={() => controller.abort()}
    />,
  );

  const runPromise = new Executor(
    input,
    store,
    controller.signal,
    DEFAULT_TEST_DIMENSIONS,
  ).run();
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
