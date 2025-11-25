import { Box, useApp } from "ink";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Suite as SuiteStore } from "../state/Suite.js";
import { Check } from "./Check/index.js";
import { LayoutProvider } from "./LayoutContext.js";
import { Legend } from "./Legend.js";
import { Suite } from "./Suite.js";

interface AppProps {
  store: SuiteStore;
  interactive: boolean;
  abortSignal: AbortSignal;
  onAbort: () => void;
}

export function App({ store, interactive, abortSignal, onAbort }: AppProps) {
  const { exit } = useApp();
  const suite = useSyncExternalStore(
    store.subscribe,
    store.toState,
    store.toState,
  );
  const { projects, isComplete } = suite;
  const checks = projects.flatMap((project) => project.checks);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const focusableCount = Math.min(checks.length, 9);
  const maxFocusableIndex = focusableCount - 1;
  const focusedCheck =
    focusedIndex === null || checks[focusedIndex] === undefined
      ? null
      : { check: checks[focusedIndex], index: focusedIndex };

  const onFocusChange = useCallback((nextIndex: number | null) => {
    setFocusedIndex(nextIndex);
  }, []);

  useEffect(() => {
    if (!interactive && isComplete) {
      exit();
    }
  }, [isComplete, exit, interactive]);

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
        <Check
          check={focusedCheck.check}
          index={focusedCheck.index}
          showOutput
        />
      ) : (
        <Suite projects={projects} />
      )}
      {interactive ? (
        <Box
          marginTop={1}
          key={focusedIndex === null ? "legend-list" : `legend-${focusedIndex}`}
        >
          <Legend
            interactive={interactive}
            isComplete={isComplete}
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
