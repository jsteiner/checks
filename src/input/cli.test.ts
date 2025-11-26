import assert from "node:assert/strict";
import test from "node:test";
import { parseCLIOptions } from "./cli.js";

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

  assert.deepEqual(options, {
    interactive: false,
    recursive: false,
    failFast: false,
    filters: [
      { type: "only", pattern: "lint" },
      { type: "only", pattern: "web/typecheck" },
      { type: "only", pattern: "mobile/lint:*" },
      { type: "exclude", pattern: "lint:biome" },
    ],
  });
});

test("drops empty patterns after trimming", () => {
  const options = parseCLIOptions([
    "/usr/bin/node",
    "/tmp/checks",
    "--only",
    " lint ",
    "",
    "--exclude=",
    "--exclude",
    "lint:biome",
  ]);

  assert.deepEqual(options.filters, [
    { type: "only", pattern: "lint" },
    { type: "exclude", pattern: "lint:biome" },
  ]);
});
