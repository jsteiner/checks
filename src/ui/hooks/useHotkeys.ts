import { useInput } from "ink";
import type { MutableRefObject } from "react";
import { useMemo, useRef } from "react";
import type { HotkeyConfig } from "../types.js";
import { getMatchedIndices } from "../utils/filterChecks.js";

type Hotkey = HotkeyConfig & {
  match?: (
    input: string,
    key: {
      backspace?: boolean;
      escape?: boolean;
      delete?: boolean;
      return?: boolean;
    },
  ) => boolean;
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
  numericBuffer: string | null;
  onNumericBufferChange: (buffer: string | null) => void;
}

export function useHotkeys({
  interactive,
  focusedIndex,
  maxFocusableIndex,
  isComplete,
  onFocusChange,
  onAbort,
  exit,
  numericBuffer,
  onNumericBufferChange,
}: UseHotkeysOptions): HotkeyConfig[] {
  const focusedIndexRef = useRef(focusedIndex);
  const maxFocusableIndexRef = useRef(maxFocusableIndex);
  const isCompleteRef = useRef(isComplete);
  const numericBufferRef = useRef(numericBuffer);

  focusedIndexRef.current = focusedIndex;
  maxFocusableIndexRef.current = maxFocusableIndex;
  isCompleteRef.current = isComplete;
  numericBufferRef.current = numericBuffer;

  const hotkeys = useMemo(
    () =>
      createHotkeys({
        focusedIndex,
        focusedIndexRef,
        maxFocusableIndexRef,
        isCompleteRef,
        numericBuffer,
        numericBufferRef,
        onFocusChange,
        onAbort,
        onNumericBufferChange,
        exit,
      }),
    [
      exit,
      focusedIndex,
      numericBuffer,
      onAbort,
      onFocusChange,
      onNumericBufferChange,
    ],
  );

  useInput(
    (input, key) => {
      const matchedHotkey = hotkeys.find((hotkey) => {
        if (hotkey.match) return hotkey.match(input, key);
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
  numericBuffer,
  numericBufferRef,
  onFocusChange,
  onAbort,
  onNumericBufferChange,
  exit,
}: {
  focusedIndex: number | null;
  focusedIndexRef: MutableRefObject<number | null>;
  maxFocusableIndexRef: MutableRefObject<number>;
  isCompleteRef: MutableRefObject<boolean>;
  numericBuffer: string | null;
  numericBufferRef: MutableRefObject<string | null>;
  onFocusChange: (index: number | null) => void;
  onAbort: () => void;
  onNumericBufferChange: (buffer: string | null) => void;
  exit: () => void;
}): Hotkey[] {
  const hotkeys: Hotkey[] = [];

  hotkeys.push(
    createFocusHotkeyHandler({
      focusedIndexRef,
      maxFocusableIndexRef,
      numericBufferRef,
      onFocusChange,
      onNumericBufferChange,
    }),
  );

  if (numericBuffer !== null) {
    hotkeys.push(
      createEnterHotkeyHandler({
        focusedIndex,
        focusedIndexRef,
        maxFocusableIndexRef,
        numericBuffer,
        onFocusChange,
        onNumericBufferChange,
      }),
    );
    hotkeys.push(
      createEscapeHotkeyHandler({
        onNumericBufferChange,
      }),
    );
    hotkeys.push(
      createBackspaceHotkeyHandler({
        numericBufferRef,
        onNumericBufferChange,
      }),
    );
  } else {
    if (focusedIndex !== null) {
      hotkeys.push(
        createUnfocusHotkeyHandler({
          focusedIndex,
          focusedIndexRef,
          onFocusChange,
        }),
      );
    }

    hotkeys.push(createQuitHotkeyHandler({ isCompleteRef, onAbort, exit }));
  }

  return hotkeys;
}

function createFocusHotkeyHandler({
  focusedIndexRef,
  maxFocusableIndexRef,
  numericBufferRef,
  onFocusChange,
  onNumericBufferChange,
}: {
  focusedIndexRef: MutableRefObject<number | null>;
  maxFocusableIndexRef: MutableRefObject<number>;
  numericBufferRef: MutableRefObject<string | null>;
  onFocusChange: (index: number | null) => void;
  onNumericBufferChange: (buffer: string | null) => void;
}): Hotkey {
  return {
    keys: "<n>",
    description: "focus",
    match: (input) => parseDigit(input) !== null,
    handler: (input) => {
      const currentBuffer = numericBufferRef.current ?? "";
      const newBuffer = currentBuffer + input;

      const totalChecks = maxFocusableIndexRef.current + 1;
      const matchedIndices = getMatchedIndices(totalChecks, newBuffer);

      if (matchedIndices.length === 0) {
        return;
      }

      if (matchedIndices.length === 1) {
        handleFocusToggle(
          matchedIndices[0] as number,
          focusedIndexRef,
          onFocusChange,
          onNumericBufferChange,
        );
      } else {
        onNumericBufferChange(newBuffer);
      }
    },
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
  const displayIndex = focusedIndex + 1;
  return {
    keys: `x or ${displayIndex}`,
    description: "unfocus",
    match: (input) => {
      if (input === "x") return true;

      const currentFocusedIndex = focusedIndexRef.current;
      if (currentFocusedIndex === null) return false;

      const currentDisplayIndex = (currentFocusedIndex + 1).toString();
      return input === currentDisplayIndex;
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

function parseDigit(input: string): string | null {
  if (input.length !== 1) return null;
  const code = input.charCodeAt(0);
  if (code < 48 || code > 57) return null; // 0-9 (ASCII 48-57)
  return input;
}

function handleFocusToggle(
  matchedIndex: number,
  focusedIndexRef: MutableRefObject<number | null>,
  onFocusChange: (index: number | null) => void,
  onNumericBufferChange: (buffer: string | null) => void,
): void {
  const currentFocusedIndex = focusedIndexRef.current;
  onFocusChange(currentFocusedIndex === matchedIndex ? null : matchedIndex);
  onNumericBufferChange(null);
}

function createEnterHotkeyHandler({
  focusedIndex,
  focusedIndexRef,
  maxFocusableIndexRef,
  numericBuffer,
  onFocusChange,
  onNumericBufferChange,
}: {
  focusedIndex: number | null;
  focusedIndexRef: MutableRefObject<number | null>;
  maxFocusableIndexRef: MutableRefObject<number>;
  numericBuffer: string;
  onFocusChange: (index: number | null) => void;
  onNumericBufferChange: (buffer: string | null) => void;
}): Hotkey {
  const totalChecks = maxFocusableIndexRef.current + 1;
  const matchedIndices = getMatchedIndices(totalChecks, numericBuffer);
  const willUnfocus =
    matchedIndices.length > 0 && matchedIndices[0] === focusedIndex;

  return {
    keys: "enter",
    description: willUnfocus ? "unfocus" : `focus ${numericBuffer}`,
    match: (_input, key) => key.return === true,
    handler: () => {
      if (matchedIndices.length > 0) {
        handleFocusToggle(
          matchedIndices[0] as number,
          focusedIndexRef,
          onFocusChange,
          onNumericBufferChange,
        );
      }
    },
  };
}

function createEscapeHotkeyHandler({
  onNumericBufferChange,
}: {
  onNumericBufferChange: (buffer: string | null) => void;
}): Hotkey {
  return {
    keys: "escape",
    description: "cancel",
    match: (_input, key) => key.escape === true,
    handler: () => {
      onNumericBufferChange(null);
    },
  };
}

function createBackspaceHotkeyHandler({
  numericBufferRef,
  onNumericBufferChange,
}: {
  numericBufferRef: MutableRefObject<string | null>;
  onNumericBufferChange: (buffer: string | null) => void;
}): Hotkey {
  return {
    keys: "backspace",
    description: "delete digit",
    match: (_input, key) => key.backspace === true || key.delete === true,
    handler: () => {
      const current = numericBufferRef.current;
      if (!current) return;

      const newBuffer = current.slice(0, -1);
      onNumericBufferChange(newBuffer.length === 0 ? null : newBuffer);
    },
  };
}
