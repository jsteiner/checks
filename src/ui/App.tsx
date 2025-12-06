import { Box, Spacer, useApp } from "ink";
import {
  type RefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { Suite as SuiteStore, SuiteUpdateEvent } from "../state/Suite.js";
import { BufferDisplay } from "./BufferDisplay.js";
import { Check } from "./Check/index.js";
import { WithDividers } from "./Divider.js";
import { useAbortExit } from "./hooks/useAbortExit.js";
import { useFocus } from "./hooks/useFocus.js";
import { useHotkeys } from "./hooks/useHotkeys.js";
import { LayoutProvider } from "./LayoutContext.js";
import { Legend } from "./Legend.js";
import { INSET } from "./layout.js";
import { Suite } from "./Suite/index.js";

interface AppProps {
  store: SuiteStore;
  interactive: boolean;
  abortSignal: AbortSignal;
  onAbort: () => void;
}

function createSuiteSubscriber(
  store: SuiteStore,
  filterRef: RefObject<ViewFilter>,
  onStoreChangeRef: RefObject<(() => void) | null>,
) {
  return (onStoreChange: () => void) => {
    onStoreChangeRef.current = onStoreChange;
    const unsubscribe = store.subscribe((event: SuiteUpdateEvent) => {
      const filter = filterRef.current;

      if (event.eventType === "status") {
        onStoreChange();
        return;
      }

      if (filter.mode === "focused" && event.checkIndex === filter.checkIndex) {
        onStoreChange();
      }
    });

    return () => {
      onStoreChangeRef.current = null;
      unsubscribe();
    };
  };
}

const filterFor = (focusedIndex: number | null): ViewFilter =>
  focusedIndex === null
    ? { mode: "suite" }
    : { mode: "focused", checkIndex: focusedIndex };

export function App({ store, interactive, abortSignal, onAbort }: AppProps) {
  const { exit } = useApp();
  const filterRef = useRef<ViewFilter>({ mode: "suite" });
  const onStoreChangeRef = useRef<(() => void) | null>(null);

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [numericBuffer, setNumericBuffer] = useState<string | null>(null);
  filterRef.current = filterFor(focusedIndex);

  const subscribe = useMemo(
    () => createSuiteSubscriber(store, filterRef, onStoreChangeRef),
    [store],
  );

  const suite = useSyncExternalStore(subscribe, store.toState, store.toState);

  const { projects, isComplete } = suite;

  const { checks, focusedCheck, maxFocusableIndex } = useFocus(
    projects,
    focusedIndex,
  );

  useEffect(() => {
    void focusedIndex;
    onStoreChangeRef.current?.();
  }, [focusedIndex]);

  const hotkeys = useHotkeys({
    exit,
    interactive,
    focusedIndex,
    maxFocusableIndex,
    isComplete,
    onAbort,
    onFocusChange: setFocusedIndex,
    numericBuffer,
    onNumericBufferChange: setNumericBuffer,
  });

  useAbortExit({ abortSignal, exit, interactive, isComplete });

  return (
    <LayoutProvider checks={checks} projects={projects}>
      {focusedCheck ? (
        <WithDividers>
          <Check
            project={focusedCheck.project}
            check={focusedCheck.check}
            showOutput
          />
        </WithDividers>
      ) : (
        <Suite projects={projects} />
      )}

      <Box marginY={1} paddingX={INSET}>
        {interactive ? (
          numericBuffer !== null ? (
            <>
              <Legend
                key="legend-buffered"
                interactive={interactive}
                hotkeys={hotkeys}
              />
              <Spacer />
              <BufferDisplay buffer={numericBuffer} />
            </>
          ) : (
            <Legend
              key={
                focusedIndex === null ? "legend-list" : `legend-${focusedIndex}`
              }
              interactive={interactive}
              hotkeys={hotkeys}
            />
          )
        ) : null}
      </Box>
    </LayoutProvider>
  );
}

type ViewFilter = { mode: "suite" } | { mode: "focused"; checkIndex: number };
