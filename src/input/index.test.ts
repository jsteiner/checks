import assert from "node:assert/strict";
import test from "node:test";
import { createConfigFile } from "../test/helpers/configFile.js";
import { buildInput } from "./index.js";

test("builds config, CLI, and environment", async () => {
  const configPath = await createConfigFile({
    checks: [
      { name: "lint", command: "pnpm lint" },
      { name: "test", command: "pnpm test" },
    ],
  });

  const input = await buildInput(
    configPath,
    ["node", "checks", "--interactive"],
    {
      CUSTOM: "ok",
    },
  );

  assert.equal(input.options.interactive, true);
  assert.equal(input.options.failFast, false);
  assert.deepEqual(input.config.checks, [
    { name: "lint", command: "pnpm lint" },
    { name: "test", command: "pnpm test" },
  ]);
  const env = input.environment as Record<string, string | undefined>;
  assert.equal(env["CUSTOM"], "ok");
  assert.equal(input.environment.FORCE_COLOR, "1");
});
