import assert from "node:assert/strict";
import test from "node:test";
import { createConfigFile } from "../test/helpers/configFile.js";
import { buildInput } from "./index.js";

test("builds config and CLI options", async () => {
  const configPath = await createConfigFile({
    checks: [
      { name: "lint", command: "pnpm lint" },
      { name: "test", command: "pnpm test" },
    ],
  });

  const input = await buildInput(configPath, [
    "node",
    "checks",
    "--interactive",
  ]);

  assert.equal(input.options.interactive, true);
  assert.equal(input.options.failFast, false);
  assert.deepEqual(input.config.checks, [
    { name: "lint", command: "pnpm lint" },
    { name: "test", command: "pnpm test" },
  ]);
});
