import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { createCheck, createProject } from "../../test/helpers/factories.js";
import { renderWithLayout, stripAnsi } from "../../test/helpers/ui.jsx";
import { LayoutProvider } from "../LayoutContext.js";
import { CheckHeader } from "./CheckHeader.js";

test("shows duration to the right of the command after completion", () => {
  const check = createCheck({
    name: "demo",
    command: "echo hi",
    cwd: "/tmp/project",
    startedAt: 1_000,
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  });
  const project = createProject({
    project: "test-project",
    path: "/tmp/config.json",
    color: "cyan",
  });
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={project} check={check} index={0} />,
    [check],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /echo hi +0\.50s$/);
});

test("omits duration while running", () => {
  const check = createCheck({
    name: "demo",
    command: "echo hi",
    cwd: "/tmp/project",
    status: "running",
  });
  const project = createProject({
    project: "test-project",
    path: "/tmp/config.json",
    color: "cyan",
  });
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={project} check={check} index={0} />,
    [check],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /echo hi/);
  assert.doesNotMatch(frame, /0\.50s/);
});

test("truncates commands longer than 20 chars with ellipsis", () => {
  const check = createCheck({
    name: "demo",
    command: "this-is-a-very-long-command-that-exceeds-twenty-characters",
    cwd: "/tmp/project",
    startedAt: 1_000,
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  });
  const project = createProject({
    project: "test-project",
    path: "/tmp/config.json",
    color: "cyan",
  });
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={project} check={check} index={0} />,
    [check],
  );

  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /this-is-a-very-long…/);
  assert.doesNotMatch(frame, /this-is-a-very-long-c/);
});

test("does not truncate commands shorter than 20 chars", () => {
  const check = createCheck({
    name: "demo",
    command: "short-cmd",
    cwd: "/tmp/project",
    startedAt: 1_000,
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  });
  const project = createProject({
    project: "test-project",
    path: "/tmp/config.json",
    color: "cyan",
  });
  const { lastFrame } = renderWithLayout(
    <CheckHeader project={project} check={check} index={0} />,
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
    cwd: "/tmp/project",
    startedAt: 1_000,
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  });
  const longCheck = createCheck({
    name: "very-long-check-name",
    command: "cmd-2",
    cwd: "/tmp/project",
    startedAt: 1_000,
    result: { status: "passed", finishedAt: 1_500, exitCode: 0 },
  });

  const shortProject = createProject({
    project: "p1",
    path: "/tmp/config.json",
    color: "cyan",
    checks: [shortCheck],
  });

  const longProject = createProject({
    project: "longer-project",
    path: "/tmp/config.json",
    color: "cyan",
    checks: [longCheck],
  });

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
