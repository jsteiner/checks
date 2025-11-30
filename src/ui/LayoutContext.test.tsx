import assert from "node:assert/strict";
import test from "node:test";
import { Text } from "ink";
import { render } from "ink-testing-library";
import type { ReactElement } from "react";
import TestRenderer from "react-test-renderer";
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

test("throws when useLayout is called outside of LayoutProvider", () => {
  const actEnv = globalThis as unknown as {
    IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
  };
  const previousActEnv = actEnv.IS_REACT_ACT_ENVIRONMENT;
  actEnv.IS_REACT_ACT_ENVIRONMENT = true;

  const App = () => {
    useLayout();
    return null;
  };

  assert.throws(
    () =>
      TestRenderer.act(() => {
        TestRenderer.create(<App />);
      }),
    /useLayout must be used within LayoutProvider/,
  );
  actEnv.IS_REACT_ACT_ENVIRONMENT = previousActEnv;
});

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
