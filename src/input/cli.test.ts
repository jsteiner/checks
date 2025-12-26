import assert from "node:assert/strict";
import { availableParallelism } from "node:os";
import { test } from "vitest";
import { parseCLIOptions } from "./cli.js";

const DEFAULT_CONCURRENCY = Math.max(
  1,
  Math.floor(availableParallelism() * 0.75),
);

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
    concurrency: DEFAULT_CONCURRENCY,
    directory: ".",
    configFileName: "checks.config.json",
    noAnsi: false,
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

test("parses concurrency as a positive integer", () => {
  const options = parseCLIOptions([
    "/usr/bin/node",
    "/tmp/checks",
    "--concurrency",
    "4",
  ]);

  assert.equal(options.concurrency, 4);
});

test("parses concurrency as Infinity", () => {
  const options = parseCLIOptions([
    "/usr/bin/node",
    "/tmp/checks",
    "--concurrency",
    "Infinity",
  ]);

  assert.equal(options.concurrency, Number.POSITIVE_INFINITY);
});

test("throws for invalid concurrency values", () => {
  assert.throws(
    () => {
      parseCLIOptions(["/usr/bin/node", "/tmp/checks", "--concurrency", "0"]);
    },
    {
      message: '--concurrency must be a positive integer or "Infinity", got: 0',
    },
  );

  assert.throws(
    () => {
      parseCLIOptions([
        "/usr/bin/node",
        "/tmp/checks",
        "--concurrency",
        "invalid",
      ]);
    },
    {
      message:
        '--concurrency must be a positive integer or "Infinity", got: invalid',
    },
  );

  assert.throws(
    () => {
      parseCLIOptions(["/usr/bin/node", "/tmp/checks", "--concurrency", "-5"]);
    },
    {
      message:
        '--concurrency must be a positive integer or "Infinity", got: -5',
    },
  );
});

test("parses directory argument", () => {
  const options = parseCLIOptions([
    "/usr/bin/node",
    "/tmp/checks",
    "/some/directory",
  ]);

  assert.equal(options.directory, "/some/directory");
});

test("directory defaults to '.' when not specified", () => {
  const options = parseCLIOptions(["/usr/bin/node", "/tmp/checks"]);

  assert.equal(options.directory, ".");
});

test("parses directory with flags", () => {
  const options = parseCLIOptions([
    "/usr/bin/node",
    "/tmp/checks",
    "/some/directory",
    "--recursive",
    "--only",
    "lint",
  ]);

  assert.equal(options.directory, "/some/directory");
  assert.equal(options.recursive, true);
  assert.deepEqual(options.filters, [{ type: "only", pattern: "lint" }]);
});

test("noAnsi defaults to false", () => {
  const options = parseCLIOptions(["/usr/bin/node", "/tmp/checks"]);

  assert.equal(options.noAnsi, false);
});

test("parses --no-ansi flag", () => {
  const options = parseCLIOptions([
    "/usr/bin/node",
    "/tmp/checks",
    "--no-ansi",
  ]);

  assert.equal(options.noAnsi, true);
});
