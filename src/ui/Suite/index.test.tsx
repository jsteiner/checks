import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { createCheck, createProject } from "../../test/helpers/factories.js";
import { stripAnsi } from "../../test/helpers/ui.jsx";
import type { ProjectState } from "../../types.js";
import { LayoutProvider } from "../LayoutContext.js";
import { Suite } from "./index.js";

function renderSuite(projects: ProjectState[]): string {
  const [project] = projects;
  if (!project) {
    throw new Error("Expected a project entry");
  }

  const { lastFrame } = render(
    <LayoutProvider checks={project.checks} projects={projects}>
      <Suite projects={projects} />
    </LayoutProvider>,
  );

  return stripAnsi(lastFrame() ?? "");
}

test("shows a project summary in the header", () => {
  const check = createCheck({
    result: { status: "passed", finishedAt: 100, exitCode: 0 },
  });

  const projects: ProjectState[] = [
    createProject({
      project: "demo",
      checks: [check],
      durationMs: 100,
      isComplete: true,
    }),
  ];

  const frame = renderSuite(projects);

  assert.match(frame, /demo/);
  assert.match(frame, /0\.10s/);
  assert.match(frame, /all passed/);
  assert.ok(!/failed/.test(frame));
  assert.ok(!/aborted/.test(frame));
});

test("shows a status breakdown when any check fails", () => {
  const projects: ProjectState[] = [
    createProject({
      project: "demo",
      checks: [
        createCheck({
          result: { status: "passed", finishedAt: 100, exitCode: 0 },
        }),
        createCheck({
          result: {
            status: "failed",
            finishedAt: 50,
            exitCode: 1,
            errorMessage: null,
          },
        }),
      ],
      durationMs: 100,
      isComplete: true,
    }),
  ];

  const frame = renderSuite(projects);

  assert.match(frame, /demo/);
  assert.match(frame, /0\.10s/);
  assert.match(frame, /1 passed/);
  assert.match(frame, /1 failed/);
  assert.match(frame, /0 aborted/);
  assert.ok(!/all passed/.test(frame));
});

test("renders multiple projects with sequential check indexes", () => {
  const checks = [
    createCheck({
      name: "one",
      result: { status: "passed", finishedAt: 10, exitCode: 0 },
    }),
    createCheck({
      name: "two",
      result: { status: "passed", finishedAt: 20, exitCode: 0 },
    }),
    createCheck({
      name: "three",
      result: { status: "passed", finishedAt: 30, exitCode: 0 },
    }),
  ];

  const [first, second, third] = checks;
  if (!first || !second || !third) {
    throw new Error("Expected three checks");
  }

  const projects: ProjectState[] = [
    createProject({
      project: "alpha",
      checks: [first],
    }),
    createProject({
      project: "beta",
      checks: [second, third],
    }),
  ];

  const { lastFrame } = render(
    <LayoutProvider checks={checks} projects={projects}>
      <Suite projects={projects} />
    </LayoutProvider>,
  );

  const frame = stripAnsi(lastFrame() ?? "");

  assert.match(frame, /1\.\s+passed\s+alpha\/one/);
  assert.match(frame, /2\.\s+passed\s+beta\/two/);
  assert.match(frame, /3\.\s+passed\s+beta\/three/);
});
