import assert from "node:assert/strict";
import { test } from "vitest";
import { getProjectColor } from "../input/projectColors.js";
import { Suite } from "../state/Suite.js";
import { renderApp } from "../test/helpers/app.jsx";
import {
  stripAnsi,
  tick,
  waitFor,
  waitForFrameMatch,
} from "../test/helpers/ui.jsx";
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
  const { ink } = renderApp(App, store);

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
  const { ink } = renderApp(App, store, { interactive: true });

  store.getCheck(0, 0).setOutput("alpha");
  store.getCheck(0, 1).setOutput("bravo");

  let frame = await waitForFrameMatch(ink, /<n> to focus/);

  ink.stdin.write("z");
  frame = await waitForFrameMatch(ink, /first/);

  ink.stdin.write("1");
  await tick();
  frame = stripAnsi(ink.lastFrame() ?? "");
  assert.match(frame, /alpha/);
  assert.doesNotMatch(frame, /bravo/);
  assert.match(frame, /x or 1 to unfocus · <n> to focus · q to quit/);

  ink.stdin.write("1");
  frame = await waitForFrameMatch(ink, /second/);
  assert.match(frame, /first/);

  ink.stdin.write("1");
  frame = await waitForFrameMatch(ink, /<n> to focus/);
  assert.doesNotMatch(frame, /unfocus/);

  ink.unmount();
});

test("suite view ignores streaming output, focused view receives it", async () => {
  const store = new Suite({ projects: [SAMPLE_PROJECT] });
  const { ink } = renderApp(App, store, { interactive: true });

  await waitForFrameMatch(ink, /<n> to focus/);

  store.getCheck(0, 0).setOutput("chunk-one");
  await tick();
  assert.doesNotMatch(ink.lastFrame() ?? "", /chunk-one/);

  ink.stdin.write("1");
  await waitForFrameMatch(ink, /chunk-one/);

  store.getCheck(0, 0).setOutput("chunk-two");
  await waitForFrameMatch(ink, /chunk-two/);

  ink.stdin.write("x");
  await waitForFrameMatch(ink, /<n> to focus/);

  store.getCheck(0, 0).setOutput("chunk-three");
  await tick();
  assert.doesNotMatch(ink.lastFrame() ?? "", /chunk-three/);

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
  const { ink } = renderApp(App, store, { interactive: true });

  const check = store.getCheck(0, 0);
  check.setOutput("problem");
  check.markFailed(1, null);

  const frame = await waitForFrameMatch(ink, /problem/);
  assert.match(frame, /fail/);

  ink.unmount();
});

test("aborts when quitting while checks are running", async () => {
  const store = new Suite({ projects: [SAMPLE_PROJECT] });
  let aborted = false;

  const { ink, controller } = renderApp(App, store, {
    interactive: true,
    onAbort: () => {
      aborted = true;
      controller.abort();
    },
  });

  ink.stdin.write("q");
  await waitFor(() => aborted && controller.signal.aborted);

  assert.equal(aborted, true);
  assert.equal(controller.signal.aborted, true);

  ink.unmount();
});

test("ignores number keys outside the focusable range", async () => {
  const store = new Suite({ projects: [SAMPLE_PROJECT] });
  const { ink } = renderApp(App, store, { interactive: true });

  ink.stdin.write("9");
  const frame = await waitForFrameMatch(ink, /<n> to focus/);

  assert.match(frame, /first/);
  assert.match(frame, /second/);

  ink.unmount();
});

test("exits when the abort signal is already fired", async () => {
  const events: string[] = [];

  const store = new Suite({ projects: [SAMPLE_PROJECT] });
  const { ink } = renderApp(App, store);

  await tick();
  assert.deepEqual(events, []);
  ink.unmount();
});

test("does not abort when quitting after completion", async () => {
  const store = new Suite({ projects: [SAMPLE_PROJECT] });
  store.getCheck(0, 0).markPassed(0);
  store.getCheck(0, 1).markPassed(0);

  let abortCalled = false;

  const { ink, controller } = renderApp(App, store, {
    interactive: true,
    onAbort: () => {
      abortCalled = true;
      controller.abort();
    },
  });

  ink.stdin.write("q");
  await tick();

  assert.equal(abortCalled, false);
  assert.equal(controller.signal.aborted, false);

  ink.unmount();
});
