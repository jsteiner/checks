import { Box } from "ink";
import type { CheckState, ProjectState } from "../../types.js";
import { FailedChecks } from "./FailedChecks.js";
import { Summary } from "./Summary.js";

interface SuiteProps {
  projects: ProjectState[];
}

interface CheckWithProject {
  check: CheckState;
  project: ProjectState;
}

export function Suite({ projects }: SuiteProps) {
  const allChecks: CheckWithProject[] = [];
  for (const project of projects) {
    for (const check of project.checks) {
      allChecks.push({ check, project });
    }
  }

  const failedChecks = allChecks.filter(
    ({ check }) => check.result.status === "failed",
  );

  return (
    <Box flexDirection="column" gap={1}>
      <FailedChecks checks={failedChecks} />
      <Summary checks={allChecks} />
    </Box>
  );
}
