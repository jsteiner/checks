import { Box, Text } from "ink";
import { filterLog } from "../display.js";
import type { CheckState } from "../types.js";
import type { VisibleStreams } from "./types.js";

interface CheckOutputProps {
  check: CheckState;
  visibleStreams: VisibleStreams;
}

export function CheckOutput({ check, visibleStreams }: CheckOutputProps) {
  if (visibleStreams === "none") {
    return null;
  }

  const visibleEntries = filterLog(check.log, visibleStreams);
  const combined = visibleEntries.map((entry) => entry.text).join("");
  const rawLines = combined.split("\n").map((line) => line.replace(/\r/g, ""));
  const lines = rawLines.length === 1 && rawLines[0] === "" ? [] : rawLines;
  const emptyMessage = getEmptyMessage(visibleStreams);

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

function getEmptyMessage(streams: VisibleStreams) {
  if (streams === "stdout") return "No stdout";
  if (streams === "stderr") return "No stderr";
  return "No output";
}
