import assert from "node:assert/strict";
import test from "node:test";
import { createCheck } from "../test/helpers/check.js";
import { formatCheckDurationLabel, formatDuration } from "./display.js";

test("formatDuration shows seconds with two decimals", () => {
  assert.equal(formatDuration(0), "0.00s");
  assert.equal(formatDuration(1234), "1.23s");
  assert.equal(formatDuration(1999), "2.00s");
});

test("formatCheckDurationLabel returns a formatted duration when finished", () => {
  const check = createCheck({
    status: "passed",
    startedAt: 1_000,
    finishedAt: 2_500,
  });
  assert.equal(formatCheckDurationLabel(check), "1.50s");
});

test("formatCheckDurationLabel returns null while running", () => {
  const check = createCheck({ status: "running", startedAt: 1_000 });
  assert.equal(formatCheckDurationLabel(check), null);
});

test("formatCheckDurationLabel clamps negative durations to zero", () => {
  const check = createCheck({
    status: "failed",
    startedAt: 5_000,
    finishedAt: 4_000,
  });
  assert.equal(formatCheckDurationLabel(check), "0.00s");
});
