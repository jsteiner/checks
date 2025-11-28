import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import type { CheckResult } from "../types.js";
import { Project } from "./Project.js";

const SAMPLE_CHECKS = [
  { name: "lint", command: "pnpm lint", cwd: "/tmp/project" },
  { name: "test", command: "pnpm test", cwd: "/tmp/project" },
];

const SAMPLE_PROJECT = {
  project: "demo",
  path: "/tmp/checks.config.json",
  color: "cyan",
  checks: SAMPLE_CHECKS,
};

function expectPassed(result: CheckResult) {
  if (result.status !== "passed") {
    throw new Error(`Expected passed, got ${result.status}`);
  }
  return result;
}

function expectFailed(result: CheckResult) {
  if (result.status !== "failed") {
    throw new Error(`Expected failed, got ${result.status}`);
  }
  return result;
}

test("tracks status transitions", () => {
  const store = new Project(SAMPLE_PROJECT, 0, 0);
  const first = store.getCheck(0);
  const second = store.getCheck(1);
  assert.equal(first.result.status, "running");

  assert.equal(first.markPassed(0), true);
  const success = expectPassed(first.result);
  assert.equal(success.exitCode, 0);

  assert.equal(second.markFailed(1, "boom"), true);
  const failure = expectFailed(second.result);
  assert.equal(failure.exitCode, 1);
  assert.equal(failure.errorMessage, "boom");

  // Terminal statuses do not get overridden
  assert.equal(second.markAborted(), false);
  const stillFailure = expectFailed(second.result);
  assert.equal(stillFailure.status, "failed");
});

test("summarizes run results", () => {
  const store = new Project(SAMPLE_PROJECT, 0, Date.now() - 500);
  store.getCheck(0).markPassed(0);
  store.getCheck(1).markFailed(1, null);

  const summary = store.toState().summary;
  assert.equal(summary.total, 2);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.aborted, 0);
  assert.ok(summary.durationMs >= 0);
  assert.equal(store.toState().isComplete, true);
});

test("summary duration reflects last finished check time", () => {
  const originalNow = Date.now;
  let fakeNow = 0;
  Date.now = () => fakeNow;

  try {
    const store = new Project(SAMPLE_PROJECT, 0, fakeNow);
    fakeNow = 125;
    store.getCheck(0).markPassed(0);

    fakeNow = 250;
    store.getCheck(1).markFailed(1, null);

    fakeNow = 1000;
    const summary = store.toState().summary;
    assert.equal(summary.durationMs, 250);
    assert.equal(store.toState().isComplete, true);
  } finally {
    Date.now = originalNow;
  }
});

test("waitForCompletion resolves when all checks finish", async () => {
  const store = new Project(SAMPLE_PROJECT, 0, Date.now());
  const waitPromise = store.waitForCompletion();
  let resolved = false;
  void waitPromise.then(() => {
    resolved = true;
  });

  await delay(0);
  assert.equal(resolved, false);
  store.getCheck(0).markPassed(0);
  store.getCheck(1).markFailed(1, null);

  await waitPromise;
  assert.equal(resolved, true);
  assert.equal(store.getCheck(0).status, "passed");
  assert.equal(store.getCheck(1).status, "failed");
});

test("waitForCompletion resolves immediately when already complete", async () => {
  const store = new Project(SAMPLE_PROJECT, 0, Date.now());
  store.getCheck(0).markPassed(0);
  store.getCheck(1).markFailed(1, null);

  await store.waitForCompletion();
  assert.equal(store.getCheck(0).status, "passed");
  assert.equal(store.getCheck(1).status, "failed");
});

test("does not emit when attempting to update a terminal check", () => {
  const store = new Project(SAMPLE_PROJECT, 0, Date.now());
  let updates = 0;
  const unsubscribe = store.subscribe(() => {
    updates += 1;
  });

  store.getCheck(0).markPassed(0);
  assert.equal(updates, 1);

  store.getCheck(0).markFailed(1, "ignored");
  store.getCheck(0).markAborted();
  assert.equal(updates, 1);

  unsubscribe();
});

test("throws when requesting an unknown check index", () => {
  const store = new Project(SAMPLE_PROJECT, 0, Date.now());
  assert.throws(() => {
    store.getCheck(99);
  });
});
