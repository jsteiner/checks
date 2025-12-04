import assert from "node:assert/strict";
import { Text } from "ink";
import { render } from "ink-testing-library";
import type { ReactElement } from "react";
import { test } from "vitest";
import { createCheck, createProject } from "../test/helpers/factories.js";
import type { CheckState, ProjectState } from "../types.js";
import { LayoutProvider, useLayout } from "./LayoutContext.js";

function renderWithLayoutProvider(
  checks: CheckState[],
  projects: ProjectState[],
  children: ReactElement,
): string {
  const { lastFrame } = render(
    <LayoutProvider checks={checks} projects={projects}>
      {children}
    </LayoutProvider>,
  );

  return lastFrame() ?? "";
}

test("provides layout values inside the provider", () => {
  const checks = [createCheck({ name: "first" })];
  const projects = [createProject({ project: "test", checks })];

  const App = () => {
    const layout = useLayout();
    return <Text>{JSON.stringify(layout)}</Text>;
  };

  const lastFrame = renderWithLayoutProvider(checks, projects, <App />);

  assert.match(lastFrame, /"nameWidth":5/);
  assert.match(lastFrame, /"projectWidth":4/);
});

test("calculates projectNameWidth correctly for multiple projects", () => {
  const check1 = createCheck({ name: "short" });
  const check2 = createCheck({ name: "very-long-name" });

  const projects = [
    createProject({ project: "proj1", checks: [check1] }),
    createProject({ project: "longer-project", checks: [check2] }),
  ];

  const App = () => {
    const layout = useLayout();
    return <Text>{JSON.stringify(layout)}</Text>;
  };

  const lastFrame = renderWithLayoutProvider(
    [check1, check2],
    projects,
    <App />,
  );

  // proj1/short = 5 + 1 + 5 = 11
  // longer-project/very-long-name = 14 + 1 + 14 = 29
  // projectNameWidth should be 29
  assert.match(lastFrame, /"projectNameWidth":29/);
});
