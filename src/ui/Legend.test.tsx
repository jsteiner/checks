import assert from "node:assert/strict";
import test from "node:test";
import { Box, Text } from "ink";
import { render } from "ink-testing-library";
import { stripAnsi, waitFor, waitForFrameMatch } from "../test/helpers/ui.jsx";
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

test("quit hotkey does not abort when all checks are done", async () => {
  let aborted = false;
  let quit = false;
  const ink = render(
    <Legend
      interactive
      isComplete
      focusedIndex={null}
      maxFocusableIndex={0}
      onFocusChange={() => {}}
      onAbort={() => {
        aborted = true;
      }}
      onQuit={() => {
        quit = true;
      }}
    />,
  );

  ink.stdin.write("q");
  await waitFor(() => quit);

  assert.equal(aborted, false);
  assert.equal(quit, true);

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

function LegendWithLabel({
  label,
  focusedIndex,
  maxFocusableIndex,
}: {
  label: string;
  focusedIndex: number | null;
  maxFocusableIndex: number;
}) {
  return (
    <Box flexDirection="column">
      <Text>{label}</Text>
      <Legend
        interactive
        isComplete={false}
        focusedIndex={focusedIndex}
        maxFocusableIndex={maxFocusableIndex}
        onFocusChange={() => {}}
        onAbort={() => {}}
        onQuit={() => {}}
      />
    </Box>
  );
}
