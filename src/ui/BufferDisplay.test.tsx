import assert from "node:assert/strict";
import { render } from "ink-testing-library";
import { test } from "vitest";
import { stripAnsi } from "../test/helpers/ui.jsx";
import { BufferDisplay } from "./BufferDisplay.js";

test("displays single digit buffer", () => {
  const { lastFrame } = render(<BufferDisplay buffer="1" />);
  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /Input:/);
  assert.match(frame, /1/);
});

test("displays multi-digit buffer", () => {
  const { lastFrame } = render(<BufferDisplay buffer="123" />);
  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /Input:/);
  assert.match(frame, /123/);
});

test("displays zero in buffer", () => {
  const { lastFrame } = render(<BufferDisplay buffer="10" />);
  const frame = stripAnsi(lastFrame() ?? "");
  assert.match(frame, /Input:/);
  assert.match(frame, /10/);
});
