import { Box } from "ink";
import type { CheckState, ProjectState } from "../../types.js";
import { Divider } from "../Divider.js";
import { OutputSection } from "./OutputSection.js";

interface CheckWithProject {
  check: CheckState;
  project: ProjectState;
}

interface FailedChecksProps {
  checks: CheckWithProject[];
}

export function FailedChecks({ checks }: FailedChecksProps) {
  if (checks.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {checks.map(({ check, project }) => (
        <Box
          key={`output-${project.path}-${check.index}`}
          flexDirection="column"
          gap={1}
        >
          <OutputSection check={check} project={project} />
          <Divider />
        </Box>
      ))}
    </Box>
  );
}
