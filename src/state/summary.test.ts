import assert from "node:assert/strict";
import { test } from "vitest";
import { combineSummaries } from "./summary.js";

const ZERO = {
  total: 0,
  pending: 0,
  passed: 0,
  failed: 0,
  aborted: 0,
  durationMs: 0,
};

test("combines counts and uses max duration", () => {
  const first = {
    total: 2,
    pending: 0,
    passed: 1,
    failed: 1,
    aborted: 0,
    durationMs: 50,
  };
  const second = {
    total: 1,
    pending: 0,
    passed: 0,
    failed: 0,
    aborted: 1,
    durationMs: 100,
  };

  const combined = combineSummaries([first, second]);

  assert.deepEqual(combined, {
    total: 3,
    pending: 0,
    passed: 1,
    failed: 1,
    aborted: 1,
    durationMs: 100,
  });
});

test("returns zeroed summary when given no items", () => {
  assert.deepEqual(combineSummaries([]), ZERO);
});
