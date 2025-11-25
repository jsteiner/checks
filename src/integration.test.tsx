import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { render } from "ink-testing-library";
import { Executor } from "./executor/index.js";
import type { Input } from "./input/index.js";
import { ChecksStore } from "./state/ChecksStore.js";
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

  const store = new ChecksStore(definitions, Date.now());
  const controller = new AbortController();
  const input: Input = {
    config: { checks: definitions },
    options: { interactive: false, failFast: false },
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

  const finalFrame = ink.lastFrame() ?? "";
  assert.match(finalFrame, /Summary: total 2/);
  assert.match(finalFrame, /passed/);
  assert.match(finalFrame, /failed/);
  assert.match(finalFrame, /bravo/);
});
