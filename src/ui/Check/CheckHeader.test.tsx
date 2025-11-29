import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import type { ReactElement } from "react";
import { stripAnsi } from "../../test/helpers/ui.js";
import type { CheckState, ProjectState } from "../../types.js";
import { LayoutProvider } from "../LayoutContext.js";
import { CheckHeader } from "./CheckHeader.js";

const BASE_CHECK: Omit<CheckState, "result"> = {
  name: "demo",
  command: "echo hi",
  cwd: "/tmp/project",
  startedAt: 1_000,
  output: "",
};

const BASE_PROJECT: ProjectState = {
  project: "test-project",
  path: "/tmp/config.json",
  color: "cyan",
  checks: [],
  summary: {
    total: 0,
    pending: 0,
    passed: 0,
    failed: 0,
    aborted: 0,
    durationMs: 0,
  },
  isComplete: false,
};

test("shows duration to the right of the command after completion", () => {
  const check: CheckState = {
    ...BASE_CHECK,
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  };
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={BASE_PROJECT} check={check} index={0} />,
    [check],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /echo hi +0\.50s$/);
});

test("omits duration while running", () => {
  const check: CheckState = { ...BASE_CHECK, result: { status: "running" } };
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={BASE_PROJECT} check={check} index={0} />,
    [check],
  );

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
    command: `${BASE_CHECK.command}!`,
  };
  const { lastFrame } = renderWithLayout(
    <>
      <CheckHeader project={BASE_PROJECT} check={check} index={0} />
      <CheckHeader project={BASE_PROJECT} check={widestCheck} index={1} />
    </>,
    [check, widestCheck],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  const lines = frame.split("\n").filter((line) => line.trim().length > 0);
  const [firstLine, secondLine] = lines;
  assert.ok(firstLine);
  assert.ok(secondLine);
  const firstDurationIndex = firstLine.indexOf("0.50s");
  const secondDurationIndex = secondLine.indexOf("0.50s");

  assert.notEqual(firstDurationIndex, -1);
  assert.notEqual(secondDurationIndex, -1);
  assert.equal(firstDurationIndex, secondDurationIndex);
});

test("truncates commands longer than 20 chars with ellipsis", () => {
  const check: CheckState = {
    ...BASE_CHECK,
    command: "this-is-a-very-long-command-that-exceeds-twenty-characters",
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  };
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={BASE_PROJECT} check={check} index={0} />,
    [check],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /this-is-a-very-long…/);
  assert.doesNotMatch(frame, /this-is-a-very-long-c/);
});

test("does not truncate commands shorter than 20 chars", () => {
  const check: CheckState = {
    ...BASE_CHECK,
    command: "short-cmd",
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  };
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={BASE_PROJECT} check={check} index={0} />,
    [check],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /short-cmd/);
  assert.doesNotMatch(frame, /…/);
});

function renderWithLayout(element: ReactElement, checks: CheckState[]) {
  return render(<LayoutProvider checks={checks}>{element}</LayoutProvider>);
}
