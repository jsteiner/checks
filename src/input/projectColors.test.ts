import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PROJECT_COLORS,
  getDefaultProjectColor,
  resolveProjectColor,
} from "./projectColors.js";

test("returns the default color for an in-range index", () => {
  const color = getDefaultProjectColor(1);

  assert.equal(color, DEFAULT_PROJECT_COLORS[1]);
});

test("wraps to the first default color when the index is out of range", () => {
  const color = getDefaultProjectColor(99);

  assert.equal(color, DEFAULT_PROJECT_COLORS[0]);
});

test("prefers a requested color over defaults", () => {
  const color = resolveProjectColor("chartreuse", 2);

  assert.equal(color, "chartreuse");
});

test("falls back to the default color when none is requested", () => {
  const color = resolveProjectColor(undefined, 3);

  assert.equal(color, DEFAULT_PROJECT_COLORS[3]);
});
