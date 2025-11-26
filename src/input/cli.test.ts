import assert from "node:assert/strict";
import test from "node:test";
import { parseCLIOptions } from "./cli.js";

test("parses filters in argv order and trims patterns", () => {
  const options = parseCLIOptions([
    "/usr/bin/node",
    "/tmp/checks",
    "--only",
    " lint ",
    "--exclude=lint:biome",
    "--only",
    "web:lint",
  ]);

  assert.deepEqual(options.filters, [
    { type: "only", pattern: "lint" },
    { type: "exclude", pattern: "lint:biome" },
    { type: "only", pattern: "web:lint" },
  ]);
  assert.equal(options.interactive, false);
  assert.equal(options.recursive, false);
  assert.equal(options.failFast, false);
});
