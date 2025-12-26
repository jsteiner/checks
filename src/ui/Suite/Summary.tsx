import { Box } from "ink";
import type { CheckState, ProjectState } from "../../types.js";
import { CheckHeader } from "../Check/CheckHeader.js";

interface CheckWithProject {
  check: CheckState;
  project: ProjectState;
}

interface SummaryProps {
  checks: CheckWithProject[];
}

export function Summary({ checks }: SummaryProps) {
  return (
    <Box flexDirection="column">
      {checks.map(({ check, project }) => (
        <CheckHeader
          key={`${project.path}-${check.index}`}
          project={project}
          check={check}
        />
      ))}
    </Box>
  );
}
