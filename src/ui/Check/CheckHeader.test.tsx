import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { createCheck, createProject } from "../../test/helpers/factories.js";
import { renderWithLayout, stripAnsi } from "../../test/helpers/ui.jsx";
import { LayoutProvider } from "../LayoutContext.js";
import { CheckHeader } from "./CheckHeader.js";

test("shows duration to the right of the command after completion", () => {
  const check = createCheck({
    command: "echo hi",
    startedAt: 1_000,
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  });
  const project = createProject();
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={project} check={check} />,
    [check],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /echo hi +0\.50s$/);
});

test("omits duration while running", () => {
  const check = createCheck({
    command: "echo hi",
    status: "running",
  });
  const project = createProject();
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={project} check={check} />,
    [check],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /echo hi/);
  assert.doesNotMatch(frame, /0\.50s/);
});

test("truncates commands longer than 20 chars with ellipsis", () => {
  const check = createCheck({
    command: "this-is-a-very-long-command-that-exceeds-twenty-characters",
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  });
  const project = createProject();
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={project} check={check} />,
    [check],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /this-is-a-very-long…/);
  assert.doesNotMatch(frame, /this-is-a-very-long-c/);
});

test("does not truncate commands shorter than 20 chars", () => {
  const check = createCheck({
    command: "short-cmd",
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  });
  const project = createProject();
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={project} check={check} />,
    [check],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /short-cmd/);
  assert.doesNotMatch(frame, /…/);
});

test("pads project/name combinations so commands align", () => {
  const shortCheck = createCheck({
    name: "a",
    command: "cmd-1",
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  });
  const longCheck = createCheck({
    name: "very-long-check-name",
    command: "cmd-2",
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  });

  const shortProject = createProject({
    project: "p1",
    checks: [shortCheck],
  });

  const longProject = createProject({
    project: "longer-project",
    checks: [longCheck],
  });

  const { lastFrame } = render(
    <LayoutProvider
      checks={[shortCheck, longCheck]}
      projects={[shortProject, longProject]}
    >
      <CheckHeader project={shortProject} check={shortCheck} />
      <CheckHeader project={longProject} check={longCheck} />
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
