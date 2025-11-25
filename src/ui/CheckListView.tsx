import { Box, Text } from "ink";
import { formatDuration } from "../display.js";
import type { ChecksStore } from "../state/ChecksStore.js";
import type { CheckState } from "../types.js";
import { Check } from "./Check.js";

interface CheckListViewProps {
  checks: CheckState[];
  allDone: boolean;
  summary: ReturnType<ChecksStore["summary"]>;
}

export function CheckListView({
  checks,
  allDone,
  summary,
}: CheckListViewProps) {
  return (
    <Box flexDirection="column">
      {checks.map((check) => (
        <Check
          key={check.index}
          check={check}
          showOutput={check.result.status === "failed"}
        />
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
    </Box>
  );
}
