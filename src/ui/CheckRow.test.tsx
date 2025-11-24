import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import type { CheckState } from "../types.js";
import { CheckRow } from "./CheckRow.js";

const BASE_CHECK: Omit<CheckState, "result"> = {
  index: 0,
  name: "demo",
  command: "echo hi",
  startedAt: 1_000,
  log: [],
};

test("shows duration to the right of the command after completion", () => {
  const { lastFrame } = render(
    <CheckRow
      check={{
        ...BASE_CHECK,
        result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
      }}
      indexWidth={1}
      nameWidth={BASE_CHECK.name.length}
      commandWidth={BASE_CHECK.command.length}
    />,
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /echo hi 0\.50s$/);
});

test("omits duration while running", () => {
  const { lastFrame } = render(
    <CheckRow
      check={{ ...BASE_CHECK, result: { status: "running" } }}
      indexWidth={1}
      nameWidth={BASE_CHECK.name.length}
      commandWidth={BASE_CHECK.command.length}
    />,
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /echo hi/);
  assert.doesNotMatch(frame, /0\.50s/);
});

test("pads the command so durations align", () => {
  const paddedWidth = BASE_CHECK.command.length + 3;
  const expectedSpacing = paddedWidth - BASE_CHECK.command.length + 1; // padding plus duration separator
  const { lastFrame } = render(
    <CheckRow
      check={{
        ...BASE_CHECK,
        result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
      }}
      indexWidth={1}
      nameWidth={BASE_CHECK.name.length}
      commandWidth={paddedWidth}
    />,
  );

  const frame = stripAnsi(lastFrame() ?? "");
  const pattern = new RegExp(`echo hi {${expectedSpacing}}0\\.50s$`);
  assert.match(frame, pattern);
});

function stripAnsi(value: string): string {
  const escapeChar = String.fromCharCode(27);
  const pattern = new RegExp(`${escapeChar}\\[[0-9;]*m`, "g");
  return value.replace(pattern, "");
}
