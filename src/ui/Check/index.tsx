import { Box } from "ink";
import type { CheckState } from "../../types.js";
import { CheckOutput } from "./CheckOutput.js";
import { CheckSummary } from "./CheckSummary.js";

interface CheckProps {
  check: CheckState;
  showOutput: boolean;
  index: number;
}

const borderColor = "cyan";

export function Check({ check, showOutput, index }: CheckProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
      gap={1}
    >
      <CheckOutput check={check} showOutput={showOutput} />
      {!showOutput ? null : <Divider />}
      <CheckSummary check={check} index={index} />
    </Box>
  );
}

function Divider() {
  return (
    <Box
      width="auto"
      borderStyle="single"
      borderColor={borderColor}
      flexGrow={1}
      borderBottom={true}
      borderTop={false}
      borderLeft={false}
      borderRight={false}
    />
  );
}
