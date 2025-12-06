import assert from "node:assert/strict";
import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import { test } from "vitest";
import { stripAnsi, waitForFrameMatch } from "../test/helpers/ui.jsx";
import { useHotkeys } from "./hooks/useHotkeys.js";
import { Legend } from "./Legend.js";

test("renders focus and quit legend when not focused", async () => {
  const ink = render(
    <LegendWithLabel
      label="focused=none"
      focusedIndex={null}
      maxFocusableIndex={2}
    />,
  );

  const frame = await waitForFrameMatch(ink, /<n> to focus/, {
    stripAnsi: false,
  });
  assert.match(stripAnsi(frame), /q to quit/);
  assert.doesNotMatch(frame, /unfocus/);

  ink.unmount();
});

test("shows unfocus action when a check is focused", async () => {
  const ink = render(
    <LegendWithLabel
      label="focused=0"
      focusedIndex={0}
      maxFocusableIndex={1}
    />,
  );

  let frame = await waitForFrameMatch(ink, /focused=0/);
  assert.match(frame, /x or 1 to unfocus/);

  ink.rerender(
    <LegendWithLabel
      label="focused=none"
      focusedIndex={null}
      maxFocusableIndex={1}
    />,
  );
  frame = await waitForFrameMatch(ink, /focused=none/);
  assert.doesNotMatch(frame, /unfocus/);

  ink.unmount();
});

test("shows unfocus hotkey with the focused index", async () => {
  const ink = render(
    <LegendWithLabel
      label="focused=1"
      focusedIndex={1}
      maxFocusableIndex={2}
    />,
  );

  const frame = await waitForFrameMatch(ink, /focused=1/);
  assert.match(frame, /x or 2 to unfocus/);

  ink.unmount();
});

test("renders nothing when not interactive", () => {
  const ink = render(<Legend interactive={false} hotkeys={[]} />);

  const frame = ink.lastFrame();
  assert.equal(frame, "");

  ink.unmount();
});

function LegendWithLabel({
  label,
  focusedIndex,
  maxFocusableIndex,
}: {
  label: string;
  focusedIndex: number | null;
  maxFocusableIndex: number;
}) {
  const hotkeys = useHotkeys({
    exit: () => {},
    interactive: false,
    focusedIndex,
    isComplete: false,
    maxFocusableIndex,
    onAbort: () => {},
    onFocusChange: () => {},
    numericBuffer: null,
    onNumericBufferChange: () => {},
  });

  return (
    <Box flexDirection="column">
      <Text>{label}</Text>
      <Legend interactive hotkeys={hotkeys} />
    </Box>
  );
}
