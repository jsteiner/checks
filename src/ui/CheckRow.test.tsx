import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import type { ReactElement } from "react";
import { stripAnsi } from "../test/helpers/ui.js";
import type { CheckState } from "../types.js";
import { CheckRow } from "./CheckRow.js";
import { LayoutProvider } from "./LayoutContext.js";

const BASE_CHECK: Omit<CheckState, "result"> = {
  index: 0,
  name: "demo",
  command: "echo hi",
  startedAt: 1_000,
  log: [],
};

test("shows duration to the right of the command after completion", () => {
  const check: CheckState = {
    ...BASE_CHECK,
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  };
  const { lastFrame } = renderWithLayout(<CheckRow check={check} />, [check]);

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /echo hi +0\.50s$/);
});

test("omits duration while running", () => {
  const check: CheckState = { ...BASE_CHECK, result: { status: "running" } };
  const { lastFrame } = renderWithLayout(<CheckRow check={check} />, [check]);

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /echo hi/);
  assert.doesNotMatch(frame, /0\.50s/);
});

test("pads the command so durations align", () => {
  const check: CheckState = {
    ...BASE_CHECK,
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  };
  const widestCheck: CheckState = {
    ...check,
    index: 1,
    command: `${BASE_CHECK.command}!`,
  };
  const { lastFrame } = renderWithLayout(
    <>
      <CheckRow check={check} />
      <CheckRow check={widestCheck} />
    </>,
    [check, widestCheck],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  const [firstLine, secondLine] = frame.split("\n");
  assert.ok(firstLine);
  assert.ok(secondLine);
  const firstDurationIndex = firstLine.indexOf("0.50s");
  const secondDurationIndex = secondLine.indexOf("0.50s");

  assert.notEqual(firstDurationIndex, -1);
  assert.notEqual(secondDurationIndex, -1);
  assert.equal(firstDurationIndex, secondDurationIndex);
});

function renderWithLayout(element: ReactElement, checks: CheckState[]) {
  return render(<LayoutProvider checks={checks}>{element}</LayoutProvider>);
}
