import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { render } from "ink-testing-library";
import { ChecksStore } from "../state/ChecksStore.js";
import { App } from "./App.js";

const SAMPLE_CHECKS = [
  { name: "first", command: "echo first" },
  { name: "second", command: "echo second" },
];

test("shows interactive legend and focuses/unfocuses checks", async () => {
  const store = new ChecksStore(SAMPLE_CHECKS, Date.now());
  const controller = new AbortController();
  const ink = render(
    <App
      store={store}
      interactive
      abortSignal={controller.signal}
      onAbort={() => controller.abort()}
    />,
  );

  store.appendStdout(0, "alpha");
  store.appendStderr(1, "bravo");

  let frame = ink.lastFrame() ?? "";
  assert.match(frame, /<n>:\s+focus/);

  ink.stdin.write("z");
  await delay(10);

  frame = ink.lastFrame() ?? "";
  assert.match(frame, /first/);

  ink.stdin.write("1");
  await delay(10);

  frame = ink.lastFrame() ?? "";
  assert.match(frame, /alpha/);
  assert.doesNotMatch(frame, /second/);
  assert.match(frame, /o:\s+stdout/);

  ink.stdin.write("1");
  await delay(10);

  frame = ink.lastFrame() ?? "";
  assert.match(frame, /first/);
  assert.match(frame, /second/);

  ink.unmount();
});

test("filters logs in focus view and shows empty states", async () => {
  const store = new ChecksStore(
    [{ name: "stderr-only", command: "echo err" }],
    Date.now(),
  );
  const controller = new AbortController();
  const ink = render(
    <App
      store={store}
      interactive
      abortSignal={controller.signal}
      onAbort={() => controller.abort()}
    />,
  );

  store.appendStderr(0, "problem");

  ink.stdin.write("1");
  await delay(0);

  let frame = ink.lastFrame() ?? "";
  assert.match(frame, /problem/);

  ink.stdin.write("o");
  await delay(0);

  frame = ink.lastFrame() ?? "";
  assert.match(frame, /No stdout/);
  assert.doesNotMatch(frame, /problem/);

  ink.stdin.write("e");
  await delay(0);

  frame = ink.lastFrame() ?? "";
  assert.match(frame, /problem/);
  assert.doesNotMatch(frame, /No stdout/);

  ink.stdin.write("a");
  await delay(10);

  frame = ink.lastFrame() ?? "";
  assert.match(frame, /problem/);

  ink.stdin.write("z");
  await delay(10);

  frame = ink.lastFrame() ?? "";
  assert.match(frame, /problem/);

  ink.stdin.write("x");
  await delay(10);

  frame = ink.lastFrame() ?? "";
  assert.match(frame, /<n>:\s+focus/);

  ink.unmount();
});

test("aborts when quitting while checks are running", async () => {
  const store = new ChecksStore(SAMPLE_CHECKS, Date.now());
  const controller = new AbortController();
  let aborted = false;

  const ink = render(
    <App
      store={store}
      interactive
      abortSignal={controller.signal}
      onAbort={() => {
        aborted = true;
        controller.abort();
      }}
    />,
  );

  ink.stdin.write("q");
  await delay(0);

  assert.equal(aborted, true);
  assert.equal(controller.signal.aborted, true);

  ink.unmount();
});

test("ignores number keys outside the focusable range", async () => {
  const store = new ChecksStore(SAMPLE_CHECKS, Date.now());
  const controller = new AbortController();
  const ink = render(
    <App
      store={store}
      interactive
      abortSignal={controller.signal}
      onAbort={() => controller.abort()}
    />,
  );

  ink.stdin.write("9");
  await delay(10);

  const frame = ink.lastFrame() ?? "";
  assert.match(frame, /first/);
  assert.match(frame, /second/);
  assert.match(frame, /<n>:\s+focus/);

  ink.unmount();
});

test("exits when the abort signal is already fired", async () => {
  const events: string[] = [];
  const abortSignal = {
    aborted: true,
    addEventListener: () => events.push("add"),
    removeEventListener: () => events.push("remove"),
  } as unknown as AbortSignal;

  const store = new ChecksStore(SAMPLE_CHECKS, Date.now());
  const ink = render(
    <App
      store={store}
      interactive={false}
      abortSignal={abortSignal}
      onAbort={() => {}}
    />,
  );

  await delay(10);
  assert.deepEqual(events, []);
  ink.unmount();
});

test("does not abort when quitting after completion", async () => {
  const store = new ChecksStore(SAMPLE_CHECKS, Date.now());
  store.markPassed(0, 0);
  store.markPassed(1, 0);

  let abortCalled = false;
  const controller = new AbortController();

  const ink = render(
    <App
      store={store}
      interactive
      abortSignal={controller.signal}
      onAbort={() => {
        abortCalled = true;
        controller.abort();
      }}
    />,
  );

  ink.stdin.write("q");
  await delay(10);

  assert.equal(abortCalled, false);
  assert.equal(controller.signal.aborted, false);

  ink.unmount();
});
