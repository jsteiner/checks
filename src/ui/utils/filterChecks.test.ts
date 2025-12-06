import assert from "node:assert/strict";
import { test } from "vitest";
import { getMatchedIndices } from "./filterChecks.js";

test("matches single digit at start", () => {
  const result = getMatchedIndices(25, "1");
  // Check 1 is index 0, checks 10-19 are indices 9-18
  assert.deepEqual(result, [0, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
});

test("matches multi-digit prefix", () => {
  const result = getMatchedIndices(25, "12");
  // Check 12 is index 11
  assert.deepEqual(result, [11]);
});

test("handles empty checks list", () => {
  const result = getMatchedIndices(0, "1");
  assert.deepEqual(result, []);
});
