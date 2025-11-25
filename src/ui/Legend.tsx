import { Text, useInput } from "ink";
import { useMemo } from "react";
import type { HotkeyConfig } from "./types.js";

interface LegendProps {
  interactive: boolean;
  allDone: boolean;
  focusedIndex: number | null;
  maxFocusableIndex: number;
  onFocusChange: (index: number | null) => void;
  onAbort: () => void;
  onQuit: () => void;
}

export function Legend({
  interactive,
  allDone,
  focusedIndex,
  maxFocusableIndex,
  onFocusChange,
  onAbort,
  onQuit,
}: LegendProps) {
  const hotkeys = useMemo(
    () =>
      createHotkeys({
        allDone,
        focusedIndex,
        maxFocusableIndex,
        onFocusChange,
        onAbort,
        onQuit,
      }),
    [allDone, focusedIndex, maxFocusableIndex, onAbort, onFocusChange, onQuit],
  );

  useInput(
    (input) => {
      const match = hotkeys.find((hotkey) =>
        hotkey.match ? hotkey.match(input) : input === hotkey.keys,
      );
      match?.handler(input);
    },
    { isActive: interactive },
  );

  return (
    <Text>
      {hotkeys.map((item, index) => {
        const isLast = index === hotkeys.length - 1;
        return (
          <Text key={`${item.keys}-${item.description}`}>
            <LegendItem {...item} />
            {isLast ? null : <Text> | </Text>}
          </Text>
        );
      })}
    </Text>
  );
}

function LegendItem({ keys, description, color }: HotkeyConfig) {
  return <Text color={color ?? "gray"}>{`${keys}: ${description}`}</Text>;
}

function createHotkeys({
  allDone,
  focusedIndex,
  maxFocusableIndex,
  onFocusChange,
  onAbort,
  onQuit,
}: Omit<LegendProps, "interactive">): HotkeyConfig[] {
  const hotkeys: HotkeyConfig[] = [
    createFocusHotkey({ focusedIndex, maxFocusableIndex, onFocusChange }),
    createQuitHotkey({ allDone, onAbort, onQuit }),
  ];

  if (focusedIndex !== null) {
    hotkeys.unshift(createUnfocusHotkey({ onFocusChange }));
  }

  return hotkeys;
}

function createFocusHotkey({
  focusedIndex,
  maxFocusableIndex,
  onFocusChange,
}: {
  focusedIndex: number | null;
  maxFocusableIndex: number;
  onFocusChange: (index: number | null) => void;
}): HotkeyConfig {
  return {
    keys: "<n>",
    description: "focus",
    handler: (input) => {
      const index = parseNumberKey(input);
      if (index === null || index > maxFocusableIndex) return;
      if (index === focusedIndex) {
        onFocusChange(null);
        return;
      }
      onFocusChange(index);
    },
    match: (input) => {
      const index = parseNumberKey(input);
      return index !== null && index <= maxFocusableIndex;
    },
  };
}

function createUnfocusHotkey({
  onFocusChange,
}: {
  onFocusChange: (index: number | null) => void;
}): HotkeyConfig {
  return {
    keys: "x",
    description: "unfocus",
    handler: () => onFocusChange(null),
  };
}

function createQuitHotkey({
  allDone,
  onAbort,
  onQuit,
}: {
  allDone: boolean;
  onAbort: () => void;
  onQuit: () => void;
}): HotkeyConfig {
  return {
    keys: "q",
    description: "quit",
    handler: () => {
      if (!allDone) {
        onAbort();
      }
      onQuit();
    },
  };
}

function parseNumberKey(input: string): number | null {
  if (input.length !== 1) return null;
  const code = input.charCodeAt(0);
  if (code < 49 || code > 57) return null; // 1-9
  return Number.parseInt(input, 10) - 1;
}
