import { Box, Spacer, Text } from "ink";
import type { ProjectState } from "../../types.js";
import { formatDuration } from "../display.js";
import { STATUS_COLORS, STATUS_LABELS } from "../status.js";

interface ProjectSummaryProps {
  project: ProjectState;
}

export function ProjectSummary({ project }: ProjectSummaryProps) {
  return (
    <Box flexDirection="row" gap={2}>
      <Text color={project.color}>{project.project}</Text>
      <Box flexGrow={1} flexDirection="row">
        <ProjectStatus project={project} />
        {project.isComplete ? (
          <>
            <Spacer />
            <Text color="gray">
              {formatDuration(project.summary.durationMs)}
            </Text>
          </>
        ) : null}
      </Box>
    </Box>
  );
}

function ProjectStatus({ project }: ProjectSummaryProps) {
  const { summary } = project;

  const allPassed =
    summary.total > 0 &&
    summary.passed === summary.total &&
    summary.failed === 0 &&
    summary.aborted === 0;

  if (!project.isComplete) {
    return <Text color={STATUS_COLORS.running}>{STATUS_LABELS.running}</Text>;
  }

  if (allPassed) {
    return <Text color={STATUS_COLORS.passed}>all passed</Text>;
  }

  return (
    <Box gap={2}>
      <Text color={STATUS_COLORS.passed}>
        {summary.passed} {STATUS_LABELS.passed}
      </Text>
      <Text color={STATUS_COLORS.failed}>
        {summary.failed} {STATUS_LABELS.failed}
      </Text>
      <Text color={STATUS_COLORS.aborted}>
        {summary.aborted} {STATUS_LABELS.aborted}
      </Text>
    </Box>
  );
}
