import assert from "node:assert/strict";
import test from "node:test";
import { formatLog } from "./display.js";
import type { LogEntry } from "./types.js";

const sampleLog: LogEntry[] = [
  { stream: "stdout", text: "line1\nline2\n" },
  { stream: "stderr", text: "error1\r\nerror2" },
  { stream: "stdout", text: "\n" },
];

test("formats all lines with default options", () => {
  const result = formatLog(sampleLog);
  assert.equal(
    result,
    ["line1", "line2", "", "error1", "error2", "", ""].join("\n"),
  );
});

test("filters by single stream", () => {
  const result = formatLog(sampleLog, { stream: "stderr" });
  assert.equal(result, ["error1", "error2"].join("\n"));
});

test("filters by multiple streams", () => {
  const result = formatLog(sampleLog, { stream: ["stdout", "stderr"] });
  assert.equal(
    result,
    ["line1", "line2", "", "error1", "error2", "", ""].join("\n"),
  );
});

test("applies prefix to each line", () => {
  const result = formatLog(sampleLog, { prefix: "> " });
  assert.equal(
    result,
    ["> line1", "> line2", "> ", "> error1", "> error2", "> ", "> "].join("\n"),
  );
});

test("keeps entries with only whitespace", () => {
  const log: LogEntry[] = [{ stream: "stdout", text: "   " }];
  const result = formatLog(log);
  assert.equal(result, "   ");
});
