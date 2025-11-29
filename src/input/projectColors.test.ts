import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { DEFAULT_PROJECT_COLORS, getProjectColor } from "./projectColors.js";

describe("getProjectColor", () => {
  test("returns the default color for an in-range index", () => {
    const color = getProjectColor(1);

    assert.equal(color, DEFAULT_PROJECT_COLORS[1]);
  });

  test("cycles colors for out of range indexes", () => {
    assert.equal(getProjectColor(3), DEFAULT_PROJECT_COLORS[0]);
    assert.equal(getProjectColor(4), DEFAULT_PROJECT_COLORS[1]);
    assert.equal(getProjectColor(6), DEFAULT_PROJECT_COLORS[0]);
  });
});
