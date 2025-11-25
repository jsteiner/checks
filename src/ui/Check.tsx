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
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      gap={1}
    >
      <CheckOutput check={check} visibleStreams={visibleStreams} />
      {visibleStreams === "none" ? null : <Divider />}
      <CheckRow check={check} />
    </Box>
  );
}

function Divider() {
  return (
    <Box
      width="auto"
      borderStyle="single"
      borderColor="cyan"
      flexGrow={1}
      borderBottom={true}
      borderTop={false}
      borderLeft={false}
      borderRight={false}
    />
  );
}
