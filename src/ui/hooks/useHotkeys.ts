import { useInput } from "ink";
import type { MutableRefObject } from "react";
import { useMemo, useRef } from "react";
import type { HotkeyConfig } from "../types.js";

type Hotkey = HotkeyConfig & {
  match?: (input: string) => boolean;
  handler: (input: string) => void;
};

interface UseHotkeysOptions {
  interactive: boolean;
  focusedIndex: number | null;
  maxFocusableIndex: number;
  isComplete: boolean;
  onFocusChange: (index: number | null) => void;
  onAbort: () => void;
  exit: () => void;
}

export function useHotkeys({
  interactive,
  focusedIndex,
  maxFocusableIndex,
  isComplete,
  onFocusChange,
  onAbort,
  exit,
}: UseHotkeysOptions): HotkeyConfig[] {
  const focusedIndexRef = useRef(focusedIndex);
  const maxFocusableIndexRef = useRef(maxFocusableIndex);
  const isCompleteRef = useRef(isComplete);

  focusedIndexRef.current = focusedIndex;
  maxFocusableIndexRef.current = maxFocusableIndex;
  isCompleteRef.current = isComplete;

  const hotkeys = useMemo(
    () =>
      createHotkeys({
        focusedIndex,
        focusedIndexRef,
        maxFocusableIndexRef,
        isCompleteRef,
        onFocusChange,
        onAbort,
        exit,
      }),
    [exit, focusedIndex, onAbort, onFocusChange],
  );

  useInput(
    (input) => {
      const matchedHotkey = hotkeys.find((hotkey) => {
        if (hotkey.match) return hotkey.match(input);
        return hotkey.keys === input;
      });

      matchedHotkey?.handler(input);
    },
    { isActive: interactive },
  );

  return useMemo(
    () =>
      hotkeys.map(({ keys, description }) => ({
        keys,
        description,
      })),
    [hotkeys],
  );
}

function createHotkeys({
  focusedIndex,
  focusedIndexRef,
  maxFocusableIndexRef,
  isCompleteRef,
  onFocusChange,
  onAbort,
  exit,
}: {
  focusedIndex: number | null;
  focusedIndexRef: MutableRefObject<number | null>;
  maxFocusableIndexRef: MutableRefObject<number>;
  isCompleteRef: MutableRefObject<boolean>;
  onFocusChange: (index: number | null) => void;
  onAbort: () => void;
  exit: () => void;
}): Hotkey[] {
  const hotkeys: Hotkey[] = [];

  if (focusedIndex !== null) {
    hotkeys.push(
      createUnfocusHotkeyHandler({
        focusedIndex,
        focusedIndexRef,
        onFocusChange,
      }),
    );
  }

  hotkeys.push(
    createFocusHotkeyHandler({
      focusedIndexRef,
      maxFocusableIndexRef,
      onFocusChange,
    }),
  );

  hotkeys.push(createQuitHotkeyHandler({ isCompleteRef, onAbort, exit }));

  return hotkeys;
}

function createFocusHotkeyHandler({
  focusedIndexRef,
  maxFocusableIndexRef,
  onFocusChange,
}: {
  focusedIndexRef: MutableRefObject<number | null>;
  maxFocusableIndexRef: MutableRefObject<number>;
  onFocusChange: (index: number | null) => void;
}): Hotkey {
  return {
    keys: "<n>",
    description: "focus",
    match: (input) => parseNumberKey(input) !== null,
    handler: (input) => {
      const numberKey = parseNumberKey(input);
      if (numberKey === null) return;
      if (numberKey > maxFocusableIndexRef.current) return;

      const currentFocusedIndex = focusedIndexRef.current;
      if (currentFocusedIndex !== null && numberKey === currentFocusedIndex) {
        onFocusChange(null);
        return;
      }

      onFocusChange(numberKey);
    },
  };
}

function createUnfocusHotkey({
  focusedIndex,
}: {
  focusedIndex: number;
}): HotkeyConfig {
  const displayIndex = focusedIndex + 1;
  return {
    keys: `x or ${displayIndex}`,
    description: "unfocus",
  };
}

function createUnfocusHotkeyHandler({
  focusedIndex,
  focusedIndexRef,
  onFocusChange,
}: {
  focusedIndex: number;
  focusedIndexRef: MutableRefObject<number | null>;
  onFocusChange: (index: number | null) => void;
}): Hotkey {
  return {
    ...createUnfocusHotkey({ focusedIndex }),
    match: (input) => {
      const currentFocusedIndex = focusedIndexRef.current;
      if (currentFocusedIndex === null) return false;

      const numberKey = parseNumberKey(input);
      return input === "x" || numberKey === currentFocusedIndex;
    },
    handler: () => onFocusChange(null),
  };
}

function createQuitHotkeyHandler({
  isCompleteRef,
  onAbort,
  exit,
}: {
  isCompleteRef: MutableRefObject<boolean>;
  onAbort: () => void;
  exit: () => void;
}): Hotkey {
  return {
    keys: "q",
    description: "quit",
    handler: () => {
      if (!isCompleteRef.current) {
        onAbort();
      }
      exit();
    },
  };
}

function parseNumberKey(input: string): number | null {
  if (input.length !== 1) return null;
  const code = input.charCodeAt(0);
  if (code < 49 || code > 57) return null; // 1-9
  return Number.parseInt(input, 10) - 1;
}
