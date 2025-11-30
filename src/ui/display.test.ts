import assert from "node:assert/strict";
import test from "node:test";
import { createCheck } from "../test/helpers/factories.js";
import { formatCheckDurationLabel, formatDuration } from "./display.js";

test("formatDuration shows seconds with two decimals", () => {
  assert.equal(formatDuration(0), "0.00s");
  assert.equal(formatDuration(1234), "1.23s");
  assert.equal(formatDuration(1999), "2.00s");
});

test("formatCheckDurationLabel returns a formatted duration when finished", () => {
  const check = createCheck({
    result: { status: "passed", finishedAt: 2_500, exitCode: 0 },
    startedAt: 1_000,
  });
  assert.equal(formatCheckDurationLabel(check), "1.50s");
});

test("formatCheckDurationLabel returns null while running", () => {
  const check = createCheck({ status: "running", startedAt: 1_000 });
  assert.equal(formatCheckDurationLabel(check), null);
});

test("formatCheckDurationLabel clamps negative durations to zero", () => {
  const check = createCheck({
    result: {
      status: "failed",
      finishedAt: 4_000,
      exitCode: 1,
      errorMessage: null,
    },
    startedAt: 5_000,
  });
  assert.equal(formatCheckDurationLabel(check), "0.00s");
});
