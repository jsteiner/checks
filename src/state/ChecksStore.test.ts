import assert from "node:assert/strict";
import test from "node:test";
import { ChecksStore } from "./ChecksStore.js";

const SAMPLE_CHECKS = [
  { name: "lint", command: "pnpm lint" },
  { name: "test", command: "pnpm test" },
];

test("tracks status transitions", () => {
  const store = new ChecksStore(SAMPLE_CHECKS, 0);
  const first = store.getCheck(0);
  const second = store.getCheck(1);
  const snapshot = store.getSnapshot();
  const firstState = snapshot[0];
  assert.ok(first);
  assert.ok(firstState);
  assert.equal(firstState.result.status, "running");

  assert.equal(first.markPassed(0), true);
  const afterSuccess = store.getSnapshot();
  const success = afterSuccess[0];
  assert.ok(success);
  assert.equal(success.result.status, "passed");
  assert.equal(success.result.exitCode, 0);

  assert.equal(second.markFailed(1, "boom"), true);
  const afterFailure = store.getSnapshot();
  const failure = afterFailure[1];
  assert.ok(failure);
  assert.equal(failure.result.status, "failed");
  assert.equal(failure.result.exitCode, 1);
  assert.equal(failure.result.errorMessage, "boom");

  // Terminal statuses do not get overridden
  assert.equal(second.markAborted(), false);
  const afterAbortAttempt = store.getSnapshot();
  const stillFailure = afterAbortAttempt[1];
  assert.ok(stillFailure);
  assert.equal(stillFailure.result.status, "failed");
});

test("summarizes run results", () => {
  const store = new ChecksStore(SAMPLE_CHECKS, Date.now() - 500);
  store.getCheck(0).markPassed(0);
  store.getCheck(1).markFailed(1, null);

  const summary = store.summary();
  assert.equal(summary.total, 2);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.aborted, 0);
  assert.ok(summary.durationMs >= 0);
});

test("summary duration reflects last finished check time", () => {
  const originalNow = Date.now;
  let fakeNow = 0;
  Date.now = () => fakeNow;

  try {
    const store = new ChecksStore(SAMPLE_CHECKS, fakeNow);
    fakeNow = 125;
    store.getCheck(0).markPassed(0);

    fakeNow = 250;
    store.getCheck(1).markFailed(1, null);

    fakeNow = 1000;
    const summary = store.summary();
    assert.equal(summary.durationMs, 250);
  } finally {
    Date.now = originalNow;
  }
});

test("waitForCompletion resolves when all checks finish", async () => {
  const store = new ChecksStore(SAMPLE_CHECKS, Date.now());
  const waitPromise = store.waitForCompletion();

  store.getCheck(0).markPassed(0);
  store.getCheck(1).markFailed(1, null);

  const snapshot = await waitPromise;
  const [first, second] = snapshot;
  assert.ok(first && second);
  assert.equal(first.result.status, "passed");
  assert.equal(second.result.status, "failed");
});

test("waitForCompletion resolves immediately when already complete", async () => {
  const store = new ChecksStore(SAMPLE_CHECKS, Date.now());
  store.getCheck(0).markPassed(0);
  store.getCheck(1).markFailed(1, null);

  const snapshot = await store.waitForCompletion();
  assert.equal(snapshot.length, SAMPLE_CHECKS.length);
});

test("does not emit when attempting to update a terminal check", () => {
  const store = new ChecksStore(SAMPLE_CHECKS, Date.now());
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
  const store = new ChecksStore(SAMPLE_CHECKS, Date.now());
  assert.throws(() => {
    store.getCheck(99);
  });
});
