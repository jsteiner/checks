import assert from "node:assert/strict";
import test from "node:test";
import { parseCLIOptions, toFilterRules } from "./cli.js";

test("parses filters in argv order and trims patterns", () => {
  const options = parseCLIOptions([
    "/usr/bin/node",
    "/tmp/checks",
    "--only",
    " lint ",
    "web/typecheck",
    "mobile/lint:*",
    "--exclude=lint:biome",
  ]);

  assert.deepEqual(options.only, [" lint ", "web/typecheck", "mobile/lint:*"]);
  assert.deepEqual(options.exclude, ["lint:biome"]);
  assert.equal(options.interactive, false);
  assert.equal(options.recursive, false);
  assert.equal(options.failFast, false);
});

test("builds filter rules from only/exclude", () => {
  const rules = toFilterRules({
    interactive: false,
    failFast: false,
    recursive: false,
    only: [" lint ", "web/typecheck"],
    exclude: ["", "lint:biome"],
  });

  assert.deepEqual(rules, [
    { type: "only", pattern: "lint" },
    { type: "only", pattern: "web/typecheck" },
    { type: "exclude", pattern: "lint:biome" },
  ]);
});
