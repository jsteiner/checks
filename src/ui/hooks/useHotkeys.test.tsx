import assert from "node:assert/strict";
import { Text } from "ink";
import { render } from "ink-testing-library";
import { useState } from "react";
import { test } from "vitest";
import { tick } from "../../test/helpers/ui.js";
import type { HotkeyConfig } from "../types.js";
import { useHotkeys } from "./useHotkeys.js";

function TestComponent({
  interactive,
  initialFocusedIndex = null,
  maxFocusableIndex = 0,
  isComplete,
  onAbort,
  exit,
  initialNumericBuffer = null,
}: {
  interactive: boolean;
  initialFocusedIndex?: number | null;
  maxFocusableIndex?: number;
  isComplete: boolean;
  onAbort: () => void;
  exit: () => void;
  initialNumericBuffer?: string | null;
}) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(
    initialFocusedIndex,
  );
  const [numericBuffer, setNumericBuffer] = useState<string | null>(
    initialNumericBuffer,
  );

  const hotkeys = useHotkeys({
    interactive,
    focusedIndex,
    maxFocusableIndex,
    isComplete,
    onFocusChange: setFocusedIndex,
    onAbort,
    exit,
    numericBuffer,
    onNumericBufferChange: setNumericBuffer,
  });

  return (
    <Text>
      {JSON.stringify(
        {
          hotkeys,
          focusedIndex,
          numericBuffer,
        },
        null,
        2,
      )}
    </Text>
  );
}

function setupFocusTest(options: {
  interactive?: boolean;
  initialFocusedIndex?: number | null;
  maxFocusableIndex: number;
  isComplete?: boolean;
  initialNumericBuffer?: string | null;
}) {
  const { stdin, lastFrame } = render(
    <TestComponent
      interactive={true}
      initialFocusedIndex={options.initialFocusedIndex ?? null}
      maxFocusableIndex={options.maxFocusableIndex}
      isComplete={false}
      onAbort={() => {}}
      exit={() => {}}
      initialNumericBuffer={options.initialNumericBuffer ?? null}
    />,
  );

  const getState = () => {
    const frame = lastFrame() ?? "";
    return JSON.parse(frame) as {
      hotkeys: HotkeyConfig[];
      focusedIndex: number | null;
      numericBuffer: string | null;
    };
  };

  const getHotkeys = () => getState().hotkeys;
  const getFocusedIndex = () => getState().focusedIndex;
  const getBuffer = () => getState().numericBuffer;

  return {
    stdin,
    getHotkeys,
    getFocusedIndex,
    getBuffer,
  };
}

test("ignores number key outside focusable range", () => {
  const { stdin, getFocusedIndex, getBuffer } = setupFocusTest({
    maxFocusableIndex: 2,
  });
  stdin.write("9");
  assert.strictEqual(getFocusedIndex(), null);
  assert.strictEqual(getBuffer(), null);
});

test("handles multi-character input gracefully", () => {
  const { stdin, getFocusedIndex } = setupFocusTest({
    maxFocusableIndex: 5,
  });
  stdin.write("ab");
  assert.strictEqual(getFocusedIndex(), null);
});

test("handles non-numeric single character input", () => {
  const { stdin, getFocusedIndex } = setupFocusTest({
    maxFocusableIndex: 5,
  });
  stdin.write("a");
  assert.strictEqual(getFocusedIndex(), null);
});

test("returns hotkey configs", () => {
  const { getHotkeys } = setupFocusTest({ maxFocusableIndex: 5 });
  const hotkeys = getHotkeys();

  assert.deepStrictEqual(hotkeys, [
    { keys: "<n>", description: "focus" },
    { keys: "q", description: "quit" },
  ]);
});

test("focused check shows unfocus hotkey", () => {
  const { getHotkeys } = setupFocusTest({
    maxFocusableIndex: 5,
    initialFocusedIndex: 0,
  });
  const hotkeys = getHotkeys();

  assert.deepStrictEqual(hotkeys, [
    { keys: "<n>", description: "focus" },
    { keys: "x or 1", description: "unfocus" },
    { keys: "q", description: "quit" },
  ]);
});

test("buffer mode shows escape, backspace, and enter hotkeys", () => {
  const { getHotkeys } = setupFocusTest({
    maxFocusableIndex: 5,
    initialNumericBuffer: "1",
  });
  const hotkeys = getHotkeys();

  assert.deepStrictEqual(hotkeys, [
    { keys: "<n>", description: "focus" },
    { keys: "enter", description: "focus 1" },
    { keys: "escape", description: "cancel" },
    { keys: "backspace", description: "delete digit" },
  ]);
});

test("buffer mode shows unfocus when buffer matches focused index", () => {
  const { getHotkeys } = setupFocusTest({
    maxFocusableIndex: 5,
    initialNumericBuffer: "2",
    initialFocusedIndex: 1, // Check 2 is at index 1
  });
  const hotkeys = getHotkeys();

  const enterHotkey = hotkeys.find((h) => h.keys === "enter");
  assert.strictEqual(enterHotkey?.description, "unfocus");
});

test("typing single digit with multiple matches creates buffer", async () => {
  const { stdin, getBuffer, getFocusedIndex } = setupFocusTest({
    maxFocusableIndex: 14,
  });

  stdin.write("1");
  await tick();
  // Should create buffer since "1" matches checks 1, 10, 11, 12, 13, 14, 15
  assert.strictEqual(getBuffer(), "1");
  assert.strictEqual(getFocusedIndex(), null);
});

test("typing two digits with single match focuses immediately", async () => {
  const { stdin, getBuffer, getFocusedIndex } = setupFocusTest({
    maxFocusableIndex: 14,
  });

  stdin.write("1");
  await tick();
  assert.strictEqual(getBuffer(), "1");

  stdin.write("3");
  await tick();
  // Should focus on check 13 (index 12) and clear buffer
  assert.strictEqual(getFocusedIndex(), 12);
  assert.strictEqual(getBuffer(), null);
});

test("escape key clears buffer when buffer is active", async () => {
  const { stdin, getBuffer } = setupFocusTest({
    maxFocusableIndex: 5,
    initialNumericBuffer: "1",
  });

  assert.strictEqual(getBuffer(), "1");
  stdin.write("\x1b"); // ESC key
  await tick();
  assert.strictEqual(getBuffer(), null);
});

test("backspace removes last digit from buffer", async () => {
  const { stdin, getBuffer } = setupFocusTest({
    maxFocusableIndex: 99,
    initialNumericBuffer: "12",
  });

  assert.strictEqual(getBuffer(), "12");
  stdin.write("\x7f"); // Backspace
  await tick();
  assert.strictEqual(getBuffer(), "1");
});

test("backspace on single digit clears buffer", async () => {
  const { stdin, getBuffer } = setupFocusTest({
    maxFocusableIndex: 14,
    initialNumericBuffer: "1",
  });

  assert.strictEqual(getBuffer(), "1");
  stdin.write("\x7f"); // Backspace
  await tick();
  assert.strictEqual(getBuffer(), null);
});

test("enter key focuses first match when buffer is active", async () => {
  const { stdin, getFocusedIndex, getBuffer } = setupFocusTest({
    maxFocusableIndex: 14,
    initialNumericBuffer: "1",
  });

  assert.strictEqual(getBuffer(), "1");
  stdin.write("\r"); // Enter key
  await tick();
  // Should focus check 1 (index 0) as it's the first match
  assert.strictEqual(getFocusedIndex(), 0);
  assert.strictEqual(getBuffer(), null);
});

test("typing same number twice when focused unfocuses", async () => {
  const { stdin, getFocusedIndex, getBuffer } = setupFocusTest({
    maxFocusableIndex: 4,
    initialFocusedIndex: 2,
  });

  assert.strictEqual(getFocusedIndex(), 2);
  stdin.write("3"); // Check 3 is index 2
  await tick();
  assert.strictEqual(getFocusedIndex(), null);
  assert.strictEqual(getBuffer(), null);
});

test("accepts digit 0 as part of multi-digit input", async () => {
  const { stdin, getBuffer, getFocusedIndex } = setupFocusTest({
    maxFocusableIndex: 29,
  });

  stdin.write("1");
  await tick();
  assert.strictEqual(getBuffer(), "1");

  stdin.write("0");
  await tick();
  // Should focus check 10 (index 9)
  assert.strictEqual(getFocusedIndex(), 9);
  assert.strictEqual(getBuffer(), null);
});

test("multi-digit unfocus shows correct keys in legend", () => {
  const { getHotkeys } = setupFocusTest({
    maxFocusableIndex: 99,
    initialFocusedIndex: 11, // Check 12
  });

  const hotkeys = getHotkeys();
  const unfocusHotkey = hotkeys.find((h) => h.description === "unfocus");
  assert.strictEqual(unfocusHotkey?.keys, "x or 12");
});
