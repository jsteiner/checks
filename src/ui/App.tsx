import { useApp } from "ink";
import { useSyncExternalStore } from "react";
import type { Suite as SuiteStore } from "../state/Suite.js";
import { Check } from "./Check/index.js";
import { WithDividers } from "./Divider.js";
import { useAbortExit } from "./hooks/useAbortExit.js";
import { useFocus } from "./hooks/useFocus.js";
import { LayoutProvider } from "./LayoutContext.js";
import { Legend } from "./Legend.js";
import { Suite } from "./Suite/index.js";

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
  const {
    checks,
    focusedIndex,
    focusedCheck,
    maxFocusableIndex,
    onFocusChange,
  } = useFocus(projects);

  useAbortExit({ abortSignal, exit, interactive, isComplete });

  return (
    <LayoutProvider checks={checks}>
      {focusedCheck ? (
        <WithDividers>
          <Check
            project={focusedCheck.project}
            check={focusedCheck.check}
            index={focusedCheck.index}
            showOutput
          />
        </WithDividers>
      ) : (
        <Suite projects={projects} />
      )}
      {interactive ? (
        <Legend
          key={focusedIndex === null ? "legend-list" : `legend-${focusedIndex}`}
          interactive={interactive}
          isComplete={isComplete}
          focusedIndex={focusedIndex}
          maxFocusableIndex={maxFocusableIndex}
          onFocusChange={onFocusChange}
          onAbort={onAbort}
          onQuit={exit}
        />
      ) : null}
    </LayoutProvider>
  );
}
