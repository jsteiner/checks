import { Box, Text } from "ink";
import type { CheckState, LogEntry } from "../../types.js";

interface CheckOutputProps {
  check: CheckState;
  showOutput: boolean;
}

export function CheckOutput({ check, showOutput }: CheckOutputProps) {
  if (!showOutput) {
    return null;
  }

  const combined = check.log.map((entry: LogEntry) => entry.text).join("");
  const rawLines = combined
    .split("\n")
    .map((line: string) => line.replace(/\r/g, ""));
  const lines = rawLines.length === 1 && rawLines[0] === "" ? [] : rawLines;
  const emptyMessage = "No output";
  let lineKeyCounter = 0;

  return (
    <Box flexDirection="column">
      {lines.length === 0 ? (
        <Text color="gray">{emptyMessage}</Text>
      ) : (
        lines.map((line: string) => {
          lineKeyCounter += 1;
          return (
            <Text key={`${check.startedAt}-${lineKeyCounter}`}>{line}</Text>
          );
        })
      )}
    </Box>
  );
}
