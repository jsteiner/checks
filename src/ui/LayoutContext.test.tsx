import assert from "node:assert/strict";
import test from "node:test";
import { Text } from "ink";
import { render } from "ink-testing-library";
import TestRenderer from "react-test-renderer";
import { createCheck } from "../test/helpers/check.js";
import { LayoutProvider, useLayout } from "./LayoutContext.js";

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
  const checks = [createCheck({ status: "running", name: "first" })];

  const App = () => {
    const layout = useLayout();
    return <Text>{JSON.stringify(layout)}</Text>;
  };

  const { lastFrame } = render(
    <LayoutProvider checks={checks}>
      <App />
    </LayoutProvider>,
  );

  assert.match(lastFrame() ?? "", /"nameWidth":5/);
});
