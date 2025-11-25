import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { createCheck } from "../test/helpers/check.js";
import { stripAnsi } from "../test/helpers/ui.js";
import type { ProjectState } from "../types.js";
import { LayoutProvider } from "./LayoutContext.js";
import { Suite } from "./Suite.js";

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
    <LayoutProvider checks={project.checks}>
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
    <LayoutProvider checks={project.checks}>
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
