import { Box, Spacer, Text } from "ink";
import { formatDuration } from "../../display.js";
import type { ProjectState } from "../../types.js";
import { STATUS_COLORS, STATUS_LABELS } from "../status.js";

const HEADER_PADDING = 2;

interface ProjectHeaderProps {
  project: ProjectState;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  return (
    <Box
      flexDirection="row"
      paddingLeft={HEADER_PADDING}
      paddingRight={HEADER_PADDING}
      marginTop={1}
      gap={HEADER_PADDING}
    >
      <Text color={project.color}>{project.project}</Text>
      {project.isComplete ? (
        <Box flexGrow={1} flexDirection="row">
          <ProjectStatus project={project} />
          <Spacer />
          <Text color="gray">{formatDuration(project.summary.durationMs)}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

function ProjectStatus({ project }: ProjectHeaderProps) {
  const { summary } = project;

  const allPassed =
    summary.total > 0 &&
    summary.passed === summary.total &&
    summary.failed === 0 &&
    summary.aborted === 0;

  if (allPassed) {
    return (
      <Box gap={2}>
        <Text color={STATUS_COLORS.passed}>all passed</Text>
      </Box>
    );
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
