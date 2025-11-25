import { Box, Text } from "ink";
import type { CheckState } from "../types.js";

interface CheckOutputProps {
  check: CheckState;
  showOutput: boolean;
}

export function CheckOutput({ check, showOutput }: CheckOutputProps) {
  if (!showOutput) {
    return null;
  }

  const combined = check.log.map((entry) => entry.text).join("");
  const rawLines = combined.split("\n").map((line) => line.replace(/\r/g, ""));
  const lines = rawLines.length === 1 && rawLines[0] === "" ? [] : rawLines;
  const emptyMessage = "No output";

  return (
    <Box flexDirection="column">
      {lines.length === 0 ? (
        <Text color="gray">{emptyMessage}</Text>
      ) : (
        lines.map((line, index) => (
          <Text key={`${check.index}-line-${index}`}>{line}</Text>
        ))
      )}
    </Box>
  );
}
