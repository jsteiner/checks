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

test("pads project/name combinations so commands align", () => {
  const shortCheck: CheckState = {
    ...BASE_CHECK,
    name: "a",
    command: "cmd-1",
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  };
  const longCheck: CheckState = {
    ...BASE_CHECK,
    name: "very-long-check-name",
    command: "cmd-2",
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  };

  const shortProject: ProjectState = {
    ...BASE_PROJECT,
    project: "p1",
    checks: [shortCheck],
  };

  const longProject: ProjectState = {
    ...BASE_PROJECT,
    project: "longer-project",
    checks: [longCheck],
  };

  const { lastFrame } = render(
    <LayoutProvider
      checks={[shortCheck, longCheck]}
      projects={[shortProject, longProject]}
    >
      <CheckHeader project={shortProject} check={shortCheck} index={0} />
      <CheckHeader project={longProject} check={longCheck} index={1} />
    </LayoutProvider>,
  );

  const frame = stripAnsi(lastFrame() ?? "");
  const lines = frame.split("\n").filter((line) => line.trim().length > 0);
  const [firstLine, secondLine] = lines;
  assert.ok(firstLine);
  assert.ok(secondLine);

  // Both commands should start at the same column
  const firstCommandIndex = firstLine.indexOf("cmd-1");
  const secondCommandIndex = secondLine.indexOf("cmd-2");

  assert.notEqual(firstCommandIndex, -1);
  assert.equal(firstCommandIndex, secondCommandIndex);
});

function renderWithLayout(element: ReactElement, checks: CheckState[]) {
  const projects = [
    {
      project: "test",
      path: "/test",
      color: "white" as const,
      checks,
      summary: {
        total: 0,
        pending: 0,
        passed: 0,
        failed: 0,
        aborted: 0,
        durationMs: 0,
      },
      isComplete: false,
    },
  ];
  return render(
    <LayoutProvider checks={checks} projects={projects}>
      {element}
    </LayoutProvider>,
  );
}
