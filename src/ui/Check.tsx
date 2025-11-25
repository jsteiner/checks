import { Box } from "ink";
import type { CheckState } from "../types.js";
import { CheckOutput } from "./CheckOutput.js";
import { CheckRow } from "./CheckRow.js";

interface CheckProps {
  check: CheckState;
  showOutput: boolean;
}

export function Check({ check, showOutput }: CheckProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      gap={1}
    >
      <CheckOutput check={check} showOutput={showOutput} />
      {!showOutput ? null : <Divider />}
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
