import { Box, Text } from "ink";
import { filterLog, formatLog } from "../display.js";
import type { CheckState } from "../types.js";
import { useLayout } from "./LayoutContext.js";
import type { VisibleStreams } from "./types.js";

interface CheckOutputProps {
  check: CheckState;
  visibleStreams: VisibleStreams;
}

export function CheckOutput({ check, visibleStreams }: CheckOutputProps) {
  const { indexWidth } = useLayout();
  if (visibleStreams === "none") {
    return null;
  }

  const prefix = " ".repeat(indexWidth + 2);
  const visibleEntries = filterLog(check.log, visibleStreams);
  const formattedEntries = formatLog(visibleEntries, { prefix });
  const emptyMessage = getEmptyMessage(visibleStreams);

  return (
    <Box flexDirection="column" marginTop={1}>
      {formattedEntries.length === 0 ? (
        <Text color="gray">{`${prefix}${emptyMessage}`}</Text>
      ) : (
        formattedEntries.map((line, index) => (
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
