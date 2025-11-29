import { Box } from "ink";
import type { CheckState, ProjectState } from "../../types.js";
import { INSET } from "../layout.js";
import { CheckOutput } from "./CheckOutput.js";
import { CheckSummary } from "./CheckSummary.js";

interface CheckProps {
  project: ProjectState;
  check: CheckState;
  showOutput: boolean;
  index: number;
}

export function Check({ project, check, showOutput, index }: CheckProps) {
  return (
    <Box flexDirection="column" paddingX={INSET} gap={1}>
      <CheckSummary project={project} check={check} index={index} />
      <CheckOutput check={check} showOutput={showOutput} />
    </Box>
  );
}
