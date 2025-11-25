import assert from "node:assert/strict";
import test from "node:test";
import { Check } from "./Check.js";

const definition = { name: "sample", command: "echo hi" };

test("ignores empty stdout chunks", () => {
  const check = new Check(0, definition, Date.now());

  assert.equal(check.appendStdout(""), false);

  assert.deepEqual(check.toState().log, []);
});

test("does not override a terminal status when marking passed", () => {
  const check = new Check(0, definition, Date.now());
  assert.equal(check.markFailed(1, "boom"), true);
  assert.equal(check.markPassed(0), false);

  const state = check.toState();
  assert.equal(state.result.status, "failed");
});
