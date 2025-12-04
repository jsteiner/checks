import assert from "node:assert/strict";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { test } from "vitest";
import { createCheck, createProject } from "../../test/helpers/factories.js";
import type { ProjectState } from "../../types.js";
import { useFocus } from "./useFocus.js";

function TestComponent({
  projects,
  focusedIndex,
}: {
  projects: ProjectState[];
  focusedIndex: number | null;
}) {
  const result = useFocus(projects, focusedIndex);
  return <Text>{JSON.stringify(result)}</Text>;
}

function createTestProject(): ProjectState {
  return createProject({
    project: "test",
    path: "/test",
    checks: [
      createCheck({ name: "check1", command: "echo test", cwd: "/tmp" }),
    ],
  });
}

test("returns null focusedCheck when focusedIndex is null", () => {
  const projects = [createTestProject()];

  const { lastFrame } = render(
    <TestComponent projects={projects} focusedIndex={null} />,
  );

  const frame = lastFrame() ?? "";
  assert.match(frame, /"focusedCheck":null/);
  assert.match(frame, /"maxFocusableIndex":0/);
});

test("returns null focusedCheck when project cannot be found for check index", () => {
  const projects: ProjectState[] = [];

  const { lastFrame } = render(
    <TestComponent projects={projects} focusedIndex={5} />,
  );

  const frame = lastFrame() ?? "";
  assert.match(frame, /"focusedCheck":null/);
});

test("returns focusedCheck when valid index is provided", () => {
  const projects = [createTestProject()];

  const { lastFrame } = render(
    <TestComponent projects={projects} focusedIndex={0} />,
  );

  const frame = lastFrame() ?? "";
  assert.match(frame, /"check":\{/);
  assert.match(frame, /"name":"check1"/);
  assert.match(frame, /"project":\{/);
});
