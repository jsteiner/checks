import { Box } from "ink";
import type { ProjectColor } from "../../projectColors.js";
import type { CheckState } from "../../types.js";
import { CheckOutput } from "./CheckOutput.js";
import { CheckSummary } from "./CheckSummary.js";

interface CheckProps {
  color: ProjectColor;
  check: CheckState;
  showOutput: boolean;
  index: number;
}

const borderColor = "cyan";

export function Check({ color, check, showOutput, index }: CheckProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={color}
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
