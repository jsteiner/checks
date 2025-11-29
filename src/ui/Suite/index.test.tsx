import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { createCheck } from "../../test/helpers/check.js";
import { stripAnsi } from "../../test/helpers/ui.js";
import type { ProjectState } from "../../types.js";
import { LayoutProvider } from "../LayoutContext.js";
import { Suite } from "./index.js";

test("shows a project summary in the header", () => {
  const check = createCheck({
    status: "passed",
    startedAt: 0,
    finishedAt: 100,
  });

  const projects: ProjectState[] = [
    {
      project: "demo",
      path: "/tmp/config.json",
      color: "cyan",
      checks: [check],
      summary: {
        total: 1,
        pending: 0,
        passed: 1,
        failed: 0,
        aborted: 0,
        durationMs: 100,
      },
      isComplete: true,
    },
  ];
  const [project] = projects;
  if (!project) {
    throw new Error("Expected a project entry");
  }

  const { lastFrame } = render(
    <LayoutProvider checks={project.checks} projects={projects}>
      <Suite projects={projects} />
    </LayoutProvider>,
  );

  const frame = stripAnsi(lastFrame() ?? "");

  assert.match(frame, /demo/);
  assert.match(frame, /0\.10s/);
  assert.match(frame, /all passed/);
  assert.ok(!/failed/.test(frame));
  assert.ok(!/aborted/.test(frame));
});

test("shows a status breakdown when any check fails", () => {
  const projects: ProjectState[] = [
    {
      project: "demo",
      path: "/tmp/config.json",
      color: "cyan",
      checks: [
        createCheck({
          status: "passed",
          startedAt: 0,
          finishedAt: 100,
        }),
        createCheck({
          status: "failed",
          startedAt: 0,
          finishedAt: 50,
        }),
      ],
      summary: {
        total: 2,
        pending: 0,
        passed: 1,
        failed: 1,
        aborted: 0,
        durationMs: 100,
      },
      isComplete: true,
    },
  ];
  const [project] = projects;
  if (!project) {
    throw new Error("Expected a project entry");
  }

  const { lastFrame } = render(
    <LayoutProvider checks={project.checks} projects={projects}>
      <Suite projects={projects} />
    </LayoutProvider>,
  );

  const frame = stripAnsi(lastFrame() ?? "");

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
      status: "passed",
      startedAt: 0,
      finishedAt: 10,
      name: "one",
      command: "echo one",
    }),
    createCheck({
      status: "passed",
      startedAt: 0,
      finishedAt: 20,
      name: "two",
      command: "echo two",
    }),
    createCheck({
      status: "passed",
      startedAt: 0,
      finishedAt: 30,
      name: "three",
      command: "echo three",
    }),
  ];

  const [first, second, third] = checks;
  if (!first || !second || !third) {
    throw new Error("Expected three checks");
  }

  const projects: ProjectState[] = [
    {
      project: "alpha",
      path: "/tmp/alpha.json",
      color: "cyan",
      checks: [first],
      summary: {
        total: 1,
        pending: 0,
        passed: 1,
        failed: 0,
        aborted: 0,
        durationMs: 10,
      },
      isComplete: true,
    },
    {
      project: "beta",
      path: "/tmp/beta.json",
      color: "magenta",
      checks: [second, third],
      summary: {
        total: 2,
        pending: 0,
        passed: 2,
        failed: 0,
        aborted: 0,
        durationMs: 30,
      },
      isComplete: true,
    },
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
