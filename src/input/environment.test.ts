import assert from "node:assert/strict";
import test from "node:test";
import { buildEnvironment } from "./environment.js";

test("keeps existing FORCE_COLOR value", () => {
  const env = buildEnvironment({ FORCE_COLOR: "0" });
  assert.equal(env.FORCE_COLOR, "0");
});

test("defaults FORCE_COLOR to 1 when missing", () => {
  const env = buildEnvironment({});
  assert.equal(env.FORCE_COLOR, "1");
});
