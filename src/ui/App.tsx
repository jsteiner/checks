import { Box, useApp } from "ink";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { ChecksStore } from "../state/ChecksStore.js";
import { FocusedView } from "./FocusedView.js";
import { LayoutProvider } from "./LayoutContext.js";
import { Legend } from "./Legend.js";
import { ListView } from "./ListView.js";

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
  const focusableCount = Math.min(checks.length, 9);
  const maxFocusableIndex = focusableCount - 1;
  const focusedCheck =
    focusedIndex === null ? null : (checks[focusedIndex] ?? null);
  const allDone = checks.every((check) => check.result.status !== "running");
  const summary = store.summary();

  const onFocusChange = useCallback((nextIndex: number | null) => {
    setFocusedIndex(nextIndex);
  }, []);

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

  return (
    <LayoutProvider checks={checks}>
      {focusedCheck ? (
        <FocusedView check={focusedCheck} />
      ) : (
        <ListView checks={checks} allDone={allDone} summary={summary} />
      )}
      {interactive ? (
        <Box
          marginTop={1}
          key={focusedIndex === null ? "legend-list" : `legend-${focusedIndex}`}
        >
          <Legend
            interactive={interactive}
            allDone={allDone}
            focusedIndex={focusedIndex}
            maxFocusableIndex={maxFocusableIndex}
            onFocusChange={onFocusChange}
            onAbort={onAbort}
            onQuit={exit}
          />
        </Box>
      ) : null}
    </LayoutProvider>
  );
}
