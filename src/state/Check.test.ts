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
