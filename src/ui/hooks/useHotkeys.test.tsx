import assert from "node:assert/strict";
import { render } from "ink-testing-library";
import { test } from "vitest";
import { useHotkeys } from "./useHotkeys.js";

function TestComponent({
  interactive,
  focusedIndex,
  maxFocusableIndex,
  isComplete,
  onFocusChange,
  onAbort,
  exit,
}: {
  interactive: boolean;
  focusedIndex: number | null;
  maxFocusableIndex: number;
  isComplete: boolean;
  onFocusChange: (index: number | null) => void;
  onAbort: () => void;
  exit: () => void;
}) {
  const hotkeys = useHotkeys({
    interactive,
    focusedIndex,
    maxFocusableIndex,
    isComplete,
    onFocusChange,
    onAbort,
    exit,
  });

  return <>{JSON.stringify(hotkeys)}</>;
}

function setupFocusTest(maxFocusableIndex: number) {
  let focusChangeCalled = false;
  const onFocusChange = () => {
    focusChangeCalled = true;
  };

  const { stdin } = render(
    <TestComponent
      interactive={true}
      focusedIndex={null}
      maxFocusableIndex={maxFocusableIndex}
      isComplete={false}
      onFocusChange={onFocusChange}
      onAbort={() => {}}
      exit={() => {}}
    />,
  );

  return { stdin, getFocusChangeCalled: () => focusChangeCalled };
}

test("ignores number key outside focusable range", () => {
  const { stdin, getFocusChangeCalled } = setupFocusTest(2);
  stdin.write("9");
  assert.strictEqual(getFocusChangeCalled(), false);
});

test("handles multi-character input gracefully", () => {
  const { stdin, getFocusChangeCalled } = setupFocusTest(5);
  stdin.write("ab");
  assert.strictEqual(getFocusChangeCalled(), false);
});

test("handles non-numeric single character input", () => {
  const { stdin, getFocusChangeCalled } = setupFocusTest(5);
  stdin.write("a");
  assert.strictEqual(getFocusChangeCalled(), false);
});

test("returns hotkey configs", () => {
  const { lastFrame } = render(
    <TestComponent
      interactive={true}
      focusedIndex={0}
      maxFocusableIndex={5}
      isComplete={false}
      onFocusChange={() => {}}
      onAbort={() => {}}
      exit={() => {}}
    />,
  );

  const frame = lastFrame() ?? "";
  assert.match(frame, /unfocus/);
  assert.match(frame, /focus/);
  assert.match(frame, /quit/);
});
