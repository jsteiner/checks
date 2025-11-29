import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { getProjectColor } from "../input/projectColors.js";
import { Suite } from "../state/Suite.js";
import {
  stripAnsi,
  tick,
  waitFor,
  waitForFrameMatch,
} from "../test/helpers/ui.js";
import { App } from "./App.js";

const SAMPLE_CHECKS = [
  { name: "first", command: "echo first", cwd: "/tmp/project" },
  { name: "second", command: "echo second", cwd: "/tmp/project" },
];
const SAMPLE_PROJECT = {
  project: "sample",
  path: "/tmp/checks.config.json",
  color: getProjectColor(0),
  checks: SAMPLE_CHECKS,
};

test("shows project header with a compact summary", async () => {
  const store = new Suite({ projects: [SAMPLE_PROJECT] });
  const controller = new AbortController();
  const ink = render(
    <App
      store={store}
      interactive={false}
      abortSignal={controller.signal}
      onAbort={() => controller.abort()}
    />,
  );

  store.getCheck(0, 0).markPassed(0);
  store.getCheck(0, 1).markPassed(0);

  const frame = stripAnsi(await waitForFrameMatch(ink, /all passed/));
  assert.match(frame, /sample/);
  assert.match(frame, /first/);
  assert.doesNotMatch(frame, /failed/);
  assert.doesNotMatch(frame, /aborted/);

  ink.unmount();
});

test("shows interactive legend and focuses/unfocuses checks", async () => {
  const store = new Suite({ projects: [SAMPLE_PROJECT] });
  const controller = new AbortController();
  const ink = render(
    <App
      store={store}
      interactive
      abortSignal={controller.signal}
      onAbort={() => controller.abort()}
    />,
  );

  store.getCheck(0, 0).setOutput("alpha");
  store.getCheck(0, 1).setOutput("bravo");

  let frame = await waitForFrameMatch(ink, /<n> to focus/);

  ink.stdin.write("z");
  frame = await waitForFrameMatch(ink, /first/);

  ink.stdin.write("1");
  frame = await waitForFrameMatch(ink, /alpha/);
  assert.doesNotMatch(frame, /bravo/);
  const plainFrame = stripAnsi(frame);
  assert.match(plainFrame, /x or 1 to unfocus · <n> to focus · q to quit/);

  ink.stdin.write("1");
  frame = await waitForFrameMatch(ink, /second/);
  assert.match(frame, /first/);

  ink.unmount();
});

test("shows output for failed checks in the list view", async () => {
  const store = new Suite({
    projects: [
      {
        ...SAMPLE_PROJECT,
        checks: [{ name: "fail", command: "err", cwd: "/tmp/project" }],
      },
    ],
  });
  const controller = new AbortController();
  const ink = render(
    <App
      store={store}
      interactive
      abortSignal={controller.signal}
      onAbort={() => controller.abort()}
    />,
  );

  const check = store.getCheck(0, 0);
  check.setOutput("problem");
  check.markFailed(1, null);

  const frame = await waitForFrameMatch(ink, /problem/);
  assert.match(frame, /fail/);

  ink.unmount();
});

test("aborts when quitting while checks are running", async () => {
  const store = new Suite({ projects: [SAMPLE_PROJECT] });
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
  const store = new Suite({ projects: [SAMPLE_PROJECT] });
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
  const frame = await waitForFrameMatch(ink, /<n> to focus/);

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

  const store = new Suite({ projects: [SAMPLE_PROJECT] });
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
  const store = new Suite({ projects: [SAMPLE_PROJECT] });
  store.getCheck(0, 0).markPassed(0);
  store.getCheck(0, 1).markPassed(0);

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
