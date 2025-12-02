import { Box } from "ink";
import type { CheckState, ProjectState } from "../../types.js";
import { INSET } from "../layout.js";
import { CheckHeader } from "./CheckHeader.js";
import { CheckOutput } from "./CheckOutput.js";

interface CheckProps {
  project: ProjectState;
  check: CheckState;
  showOutput: boolean;
}

export function Check({ project, check, showOutput }: CheckProps) {
  return (
    <Box flexDirection="column" paddingX={INSET} gap={1}>
      <CheckHeader project={project} check={check} />
      <CheckOutput check={check} showOutput={showOutput} />
    </Box>
  );
}
