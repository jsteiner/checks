import assert from "node:assert/strict";
import test from "node:test";
import { Check } from "./Check.js";

const definition = { name: "sample", command: "echo hi" };

test("ignores empty stdout chunks", () => {
  let updates = 0;
  const check = new Check(definition, Date.now(), () => {
    updates += 1;
  });

  assert.equal(check.appendStdout(""), false);

  assert.deepEqual(check.log, []);
  assert.equal(updates, 0);
});

test("does not override a terminal status when marking passed", () => {
  let updates = 0;
  const check = new Check(definition, Date.now(), () => {
    updates += 1;
  });
  assert.equal(check.markFailed(1, "boom"), true);
  assert.equal(check.markPassed(0), false);

  assert.equal(check.status, "failed");
  assert.equal(updates, 1);
});

test("preserves color codes in appended output", () => {
  const check = new Check(definition, Date.now());
  const coloredOutput = "\u001B[31mError:\u001B[0m Something went wrong";

  check.appendStdout(coloredOutput);

  assert.equal(check.log.length, 1);
  assert.equal(check.log[0]?.text, coloredOutput);
});

test("strips cursor movement codes from appended output", () => {
  const check = new Check(definition, Date.now());
  const outputWithCursor = "Line 1\u001B[2ALine 2";

  check.appendStdout(outputWithCursor);

  assert.equal(check.log.length, 1);
  assert.equal(check.log[0]?.text, "Line 1Line 2");
});

test("strips carriage returns from appended output", () => {
  const check = new Check(definition, Date.now());
  const outputWithCR = "Processing...\rDone!";

  check.appendStdout(outputWithCR);

  assert.equal(check.log.length, 1);
  assert.equal(check.log[0]?.text, "Processing...Done!");
});

test("handles dynamic output with colors and cursor movement", () => {
  const check = new Check(definition, Date.now());
  // Simulates knip-like output: colored progress that updates in place
  const chunk1 = "\u001B[33mScanning...\u001B[0m";
  const chunk2 = "\r\u001B[32mFound 5 issues\u001B[0m";

  check.appendStdout(chunk1);
  check.appendStdout(chunk2);

  assert.equal(check.log.length, 2);
  assert.equal(check.log[0]?.text, "\u001B[33mScanning...\u001B[0m");
  assert.equal(check.log[1]?.text, "\u001B[32mFound 5 issues\u001B[0m");
});

test("handles multiple chunks with mixed ANSI codes", () => {
  const check = new Check(definition, Date.now());

  check.appendStdout("\u001B[36mInfo:\u001B[0m ");
  check.appendStdout("Processing\u001B[K"); // With erase sequence
  check.appendStdout("\r\u001B[32mDone\u001B[0m"); // With carriage return

  assert.equal(check.log.length, 3);
  assert.equal(check.log[0]?.text, "\u001B[36mInfo:\u001B[0m ");
  assert.equal(check.log[1]?.text, "Processing");
  assert.equal(check.log[2]?.text, "\u001B[32mDone\u001B[0m");
});
