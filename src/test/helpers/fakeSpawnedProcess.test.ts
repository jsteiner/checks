import assert from "node:assert/strict";
import { test } from "vitest";
import { createFakeSpawnedProcess } from "./fakeSpawnedProcess.js";

test("emits close only once", () => {
  const child = createFakeSpawnedProcess();
  let closeCount = 0;

  child.on("close", () => {
    closeCount += 1;
  });

  child.emitClose(0, null);
  child.emitClose(0, null);

  assert.equal(closeCount, 1);
});

test("applies provided killed flag and kill implementation", () => {
  const killCalls: Array<NodeJS.Signals | undefined> = [];
  const child = createFakeSpawnedProcess({
    killed: true,
    kill: () => (signal) => {
      killCalls.push(signal);
      return true;
    },
  });

  assert.equal(child.killed, true);

  const didKill = child.kill?.("SIGTERM");

  assert.equal(didKill, true);
  assert.deepEqual(killCalls, ["SIGTERM"]);
});
