import { Box, Text } from "ink";
import type { CheckState, ProjectState } from "../../types.js";
import { CheckOutput } from "../Check/CheckOutput.js";
import { INSET } from "../layout.js";

interface OutputSectionProps {
  check: CheckState;
  project: ProjectState;
}

export function OutputSection({ check, project }: OutputSectionProps) {
  return (
    <Box flexDirection="column" paddingX={INSET} gap={1}>
      <Box flexDirection="column">
        <Text>
          <Text color={project.color}>{project.project}</Text>
          <Text color="gray">/</Text>
          <Text>{check.name}</Text>
        </Text>
        <Text color="gray">{check.command}</Text>
      </Box>
      <CheckOutput check={check} showOutput={true} />
    </Box>
  );
}
