import { Box } from "ink";
import type { CheckState } from "../types.js";
import { CheckOutput } from "./CheckOutput.js";
import { CheckRow } from "./CheckRow.js";
import type { VisibleStreams } from "./types.js";

interface CheckProps {
  check: CheckState;
  visibleStreams: VisibleStreams;
  nameWidth: number;
  indexWidth: number;
}

export function Check({
  check,
  visibleStreams,
  nameWidth,
  indexWidth,
}: CheckProps) {
  return (
    <Box flexDirection="column">
      <CheckRow check={check} indexWidth={indexWidth} nameWidth={nameWidth} />
      <CheckOutput
        check={check}
        visibleStreams={visibleStreams}
        indexWidth={indexWidth}
      />
    </Box>
  );
}
