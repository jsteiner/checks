import assert from "node:assert/strict";
import test from "node:test";
import { Check } from "./Check.js";

const definition = { name: "sample", command: "echo hi", cwd: "/tmp/project" };

test("ignores empty output updates", () => {
  let updates = 0;
  const check = new Check(definition, 0, () => {
    updates += 1;
  });

  assert.equal(check.setOutput(""), false);

  assert.equal(check.output, "");
  assert.equal(updates, 0);
});

test("does not override a terminal status when marking passed", () => {
  let updates = 0;
  const check = new Check(definition, 0, () => {
    updates += 1;
  });
  assert.equal(check.markFailed(1, "boom"), true);
  assert.equal(check.markPassed(0), false);

  assert.equal(check.status, "failed");
  assert.equal(updates, 1);
});

test("deduplicates identical output", () => {
  const check = new Check(definition, 0);

  assert.equal(check.setOutput("hello"), true);
  assert.equal(check.setOutput("hello"), false);

  assert.equal(check.output, "hello");
});

test("updates output when content changes", () => {
  const check = new Check(definition, 0);

  assert.equal(check.setOutput("first"), true);
  assert.equal(check.output, "first");

  assert.equal(check.setOutput("second"), true);
  assert.equal(check.output, "second");
});

test("notifies listeners on output update", () => {
  let updates = 0;
  const check = new Check(definition, 0, () => {
    updates += 1;
  });

  check.setOutput("test");
  assert.equal(updates, 1);

  check.setOutput("test"); // Deduplicated
  assert.equal(updates, 1);

  check.setOutput("changed");
  assert.equal(updates, 2);
});
