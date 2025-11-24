import assert from "node:assert/strict";
import test from "node:test";
import {
  filterLog,
  formatCheckDurationLabel,
  formatDuration,
  formatLog,
} from "./display.js";
import { createCheck } from "./test/helpers/check.js";
import type { LogEntry } from "./types.js";

test("formatDuration shows seconds with two decimals", () => {
  assert.equal(formatDuration(0), "0.00s");
  assert.equal(formatDuration(1234), "1.23s");
  assert.equal(formatDuration(1999), "2.00s");
});

test("formatLog prefixes lines and filters streams", () => {
  const log: LogEntry[] = [
    { stream: "stdout", text: "out line" },
    { stream: "stderr", text: "err line" },
  ];

  const prefixed = formatLog(log, { prefix: "  " });
  assert.deepEqual(prefixed, ["  out line", "  err line"]);

  const stderrOnly = formatLog(log, { stream: "stderr", prefix: "-" });
  assert.deepEqual(stderrOnly, ["-err line"]);

  const filtered = filterLog(log, "stderr");
  assert.deepEqual(filtered, [{ stream: "stderr", text: "err line" }]);
});

test("formatLog retains empty lines when prefixing", () => {
  const log: LogEntry[] = [{ stream: "stdout", text: "line1\n\nline3" }];

  const output = formatLog(log, { prefix: "*" });

  assert.deepEqual(output, ["*line1", "*", "*line3"]);
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
