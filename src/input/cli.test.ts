import assert from "node:assert/strict";
import test from "node:test";
import { parseCLIOptions } from "./cli.js";

test("parses flags when provided", () => {
  const result = parseCLIOptions([
    "node",
    "checks",
    "--interactive",
    "--fail-fast",
    "--recursive",
  ]);
  assert.deepEqual(result, {
    interactive: true,
    failFast: true,
    recursive: true,
  });
});

test("defaults options to false", () => {
  const result = parseCLIOptions(["node", "checks"]);
  assert.deepEqual(result, {
    interactive: false,
    failFast: false,
    recursive: false,
  });
});
