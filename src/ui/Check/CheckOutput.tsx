import { Box, Text } from "ink";
import type { CheckState } from "../../types.js";

interface CheckOutputProps {
  check: CheckState;
  showOutput: boolean;
}

export function CheckOutput({ check, showOutput }: CheckOutputProps) {
  if (!showOutput) {
    return null;
  }

  const rawLines = check.output.split("\n");
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
