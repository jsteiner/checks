import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { getProjectColor } from "../input/projectColors.js";
import { Suite } from "./Suite.js";

const PROJECTS = [
  {
    project: "alpha",
    path: "/tmp/alpha.json",
    color: getProjectColor(0),
    checks: [
      { name: "a", command: "echo a", cwd: "/tmp/project" },
      { name: "b", command: "echo b", cwd: "/tmp/project" },
    ],
  },
  {
    project: "beta",
    path: "/tmp/beta.json",
    color: getProjectColor(1),
    checks: [{ name: "c", command: "echo c", cwd: "/tmp/project" }],
  },
];

test("snapshot returns current state as plain objects", () => {
  const store = new Suite({ projects: PROJECTS }, 0);
  const snapshot = store.toState();

  assert.deepEqual(snapshot, {
    projects: PROJECTS.map((project, index) => ({
      ...project,
      color: getProjectColor(index),
      checks: project.checks.map((check) => ({
        ...check,
        startedAt: 0,
        output: "",
        result: { status: "running" },
      })),
      summary: {
        total: project.checks.length,
        passed: 0,
        failed: 0,
        aborted: 0,
        durationMs: 0,
      },
      isComplete: false,
    })),
    summary: { total: 3, passed: 0, failed: 0, aborted: 0, durationMs: 0 },
    isComplete: false,
  });
});

test("summarizes across all projects", () => {
  const store = new Suite({ projects: PROJECTS }, Date.now());
  store.getCheck(0, 0).markPassed(0);
  store.getCheck(0, 1).markFailed(1, null);
  store.getCheck(1, 0).markAborted();

  const { summary } = store.toState();

  assert.equal(summary.total, 3);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.aborted, 1);
});

test("waits for completion across projects", async () => {
  const store = new Suite({ projects: PROJECTS }, Date.now());
  const promise = store.waitForCompletion();
  let resolved = false;
  void promise.then(() => {
    resolved = true;
  });

  await delay(0);
  assert.equal(resolved, false);
  store.getCheck(0, 0).markPassed(0);
  store.getCheck(0, 1).markFailed(1, null);
  store.getCheck(1, 0).markPassed(0);

  await promise;
  assert.equal(resolved, true);
  assert.equal(store.getCheck(0, 0).status, "passed");
  assert.equal(store.getCheck(0, 1).status, "failed");
  assert.equal(store.getCheck(1, 0).status, "passed");
});
