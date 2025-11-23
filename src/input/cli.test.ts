import assert from "node:assert/strict";
import test from "node:test";
import { parseCLIOptions } from "./cli.js";

test("parses interactive flag when provided", () => {
  const result = parseCLIOptions(["node", "checks", "--interactive"]);
  assert.deepEqual(result, { interactive: true });
});

test("defaults interactive to false", () => {
  const result = parseCLIOptions(["node", "checks"]);
  assert.deepEqual(result, { interactive: false });
});
