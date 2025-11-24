import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { ChecksStore } from "../state/ChecksStore.js";
import { App } from "./App.js";

const SAMPLE_CHECKS = [
  { name: "first", command: "echo first" },
  { name: "second", command: "echo second" },
];

type InkInstance = ReturnType<typeof render>;

async function tick() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function waitFor(condition: () => boolean, timeoutMs = 250) {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      assert.fail("Timed out while waiting for condition");
    }
    await tick();
  }
}

async function waitForFrameMatch(
  ink: InkInstance,
  regex: RegExp,
  timeoutMs = 250,
): Promise<string> {
  let frame = "";
  await waitFor(() => {
    frame = ink.lastFrame() ?? "";
    return regex.test(frame);
  }, timeoutMs);
  return frame;
}

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

  let frame = await waitForFrameMatch(ink, /<n>:\s+focus/);

  ink.stdin.write("z");
  frame = await waitForFrameMatch(ink, /first/);

  ink.stdin.write("1");
  frame = await waitForFrameMatch(ink, /alpha/);
  assert.doesNotMatch(frame, /second/);
  assert.match(frame, /o:\s+stdout/);

  ink.stdin.write("1");
  frame = await waitForFrameMatch(ink, /second/);
  assert.match(frame, /first/);

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
  let frame = await waitForFrameMatch(ink, /problem/);

  ink.stdin.write("o");
  frame = await waitForFrameMatch(ink, /No stdout/);
  assert.match(frame, /No stdout/);
  assert.doesNotMatch(frame, /problem/);

  ink.stdin.write("e");
  frame = await waitForFrameMatch(ink, /problem/);
  assert.doesNotMatch(frame, /No stdout/);

  ink.stdin.write("a");
  frame = await waitForFrameMatch(ink, /problem/);

  ink.stdin.write("z");
  frame = await waitForFrameMatch(ink, /problem/);

  ink.stdin.write("x");
  frame = await waitForFrameMatch(ink, /<n>:\s+focus/);

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
  await waitFor(() => aborted && controller.signal.aborted);

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
  const frame = await waitForFrameMatch(ink, /<n>:\s+focus/);

  assert.match(frame, /first/);
  assert.match(frame, /second/);

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

  await tick();
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
  await tick();

  assert.equal(abortCalled, false);
  assert.equal(controller.signal.aborted, false);

  ink.unmount();
});
