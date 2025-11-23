import { useApp } from "ink";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ChecksStore } from "../state/ChecksStore.js";
import { CheckListView } from "./CheckListView.js";
import { FocusedView } from "./FocusedView.js";
import type { HotkeyConfig, VisibleStreams } from "./types.js";

interface AppProps {
  store: ChecksStore;
  interactive: boolean;
  abortSignal: AbortSignal;
  onAbort: () => void;
}

export function App({ store, interactive, abortSignal, onAbort }: AppProps) {
  const { exit } = useApp();
  const checks = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [visibleStreams, setVisibleStreams] = useState<VisibleStreams>("all");
  const focusableCount = Math.min(checks.length, 9);
  const maxFocusableIndex = focusableCount - 1;
  const focusedCheck =
    focusedIndex === null ? null : (checks[focusedIndex] ?? null);
  const nameWidth = useMemo(
    () => checks.reduce((max, check) => Math.max(max, check.name.length), 0),
    [checks],
  );
  const indexWidth = Math.max(1, String(checks.length).length);
  const allDone = checks.every((check) => check.result.status !== "running");
  const summary = store.summary();

  const onFocusChange = useCallback((nextIndex: number | null) => {
    setFocusedIndex(nextIndex);
    setVisibleStreams("all");
  }, []);

  const globalHotkeys = useMemo(
    () =>
      createGlobalHotkeys({
        allDone,
        maxFocusableIndex,
        focusedIndex,
        onFocusChange,
        onAbort,
        onQuit: exit,
      }),
    [allDone, exit, focusedIndex, maxFocusableIndex, onAbort, onFocusChange],
  );

  useEffect(() => {
    if (!interactive && allDone) {
      exit();
    }
  }, [allDone, exit, interactive]);

  useEffect(() => {
    if (abortSignal.aborted) {
      exit();
      return;
    }

    const onAbortSignal = () => exit();
    abortSignal.addEventListener("abort", onAbortSignal);
    return () => abortSignal.removeEventListener("abort", onAbortSignal);
  }, [abortSignal, exit]);

  if (focusedCheck) {
    return (
      <FocusedView
        check={focusedCheck}
        visibleStreams={visibleStreams}
        nameWidth={nameWidth}
        indexWidth={indexWidth}
        onVisibleStreamsChange={setVisibleStreams}
        onFocusChange={onFocusChange}
        globalHotkeys={globalHotkeys}
        interactive={interactive}
      />
    );
  }

  return (
    <CheckListView
      checks={checks}
      nameWidth={nameWidth}
      indexWidth={indexWidth}
      allDone={allDone}
      summary={summary}
      interactive={interactive}
      globalHotkeys={globalHotkeys}
    />
  );
}

function createGlobalHotkeys({
  allDone,
  maxFocusableIndex,
  focusedIndex,
  onFocusChange,
  onAbort,
  onQuit,
}: {
  allDone: boolean;
  maxFocusableIndex: number;
  focusedIndex: number | null;
  onFocusChange: (index: number | null) => void;
  onAbort: () => void;
  onQuit: () => void;
}): HotkeyConfig[] {
  return [
    {
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
    },
    {
      keys: "q",
      description: "quit",
      handler: () => {
        if (!allDone) {
          onAbort();
        }
        onQuit();
      },
    },
  ];
}

function parseNumberKey(input: string): number | null {
  if (input.length !== 1) return null;
  const code = input.charCodeAt(0);
  if (code < 49 || code > 57) return null; // 1-9
  return Number.parseInt(input, 10) - 1;
}
