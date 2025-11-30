import assert from "node:assert/strict";
import test from "node:test";
import { render } from "ink-testing-library";
import { createCheck } from "../../test/helpers/factories.js";
import { CheckOutput } from "./CheckOutput.js";

test("returns null when output is hidden", () => {
  const check = createCheck({ output: "hello" });
  const ink = render(<CheckOutput check={check} showOutput={false} />);

  assert.equal(ink.lastFrame(), "");
});

test("shows an empty state when there is no output", () => {
  const check = createCheck();
  const ink = render(<CheckOutput check={check} showOutput />);

  assert.match(ink.lastFrame() ?? "", /No output/);
});
