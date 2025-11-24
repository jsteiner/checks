import { Box, Text } from "ink";
import { useMemo } from "react";
import { formatDuration } from "../display.js";
import type { ChecksStore } from "../state/ChecksStore.js";
import type { CheckState } from "../types.js";
import { Check } from "./Check.js";
import { Legend } from "./Legend.js";
import type { HotkeyConfig } from "./types.js";

interface CheckListViewProps {
  checks: CheckState[];
  allDone: boolean;
  summary: ReturnType<ChecksStore["summary"]>;
  interactive: boolean;
  globalHotkeys: HotkeyConfig[];
}

export function CheckListView({
  checks,
  allDone,
  summary,
  interactive,
  globalHotkeys,
}: CheckListViewProps) {
  const hotkeys = useMemo(
    () => [...createListHotkeys(), ...globalHotkeys],
    [globalHotkeys],
  );

  return (
    <Box flexDirection="column">
      {checks.map((check) => (
        <Box
          key={check.index}
          flexDirection="column"
          marginBottom={check.result.status === "failed" ? 1 : 0}
        >
          <Check
            check={check}
            visibleStreams={check.result.status === "failed" ? "all" : "none"}
          />
        </Box>
      ))}
      {allDone ? (
        <Box marginTop={1}>
          <Text>
            Summary: total {summary.total}, passed {summary.passed}, failed{" "}
            {summary.failed}, aborted {summary.aborted}, elapsed{" "}
            {formatDuration(summary.durationMs)}
          </Text>
        </Box>
      ) : null}
      {interactive ? (
        <Box marginTop={1}>
          <Legend hotkeys={hotkeys} interactive={interactive} />
        </Box>
      ) : null}
    </Box>
  );
}

function createListHotkeys(): HotkeyConfig[] {
  return [];
}
