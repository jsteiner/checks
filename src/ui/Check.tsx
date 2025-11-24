import { Box } from "ink";
import type { CheckState } from "../types.js";
import { CheckOutput } from "./CheckOutput.js";
import { CheckRow } from "./CheckRow.js";
import type { VisibleStreams } from "./types.js";

interface CheckProps {
  check: CheckState;
  visibleStreams: VisibleStreams;
}

export function Check({ check, visibleStreams }: CheckProps) {
  return (
    <Box flexDirection="column">
      <CheckRow check={check} />
      <CheckOutput check={check} visibleStreams={visibleStreams} />
    </Box>
  );
}
