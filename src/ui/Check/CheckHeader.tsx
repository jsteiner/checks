import { Box, Spacer, Text } from "ink";
import type { CheckState, CheckStatus, ProjectState } from "../../types.js";
import { formatCheckDurationLabel } from "../display.js";
import { useLayout } from "../LayoutContext.js";
import { LONG_STATUS_WIDTH, STATUS_COLORS, STATUS_LABELS } from "../status.js";

interface CheckHeaderProps {
  project: ProjectState;
  check: CheckState;
}

export function CheckHeader({ project, check }: CheckHeaderProps) {
  const { indexWidth, projectNameWidth, commandWidth } = useLayout();
  const status: CheckStatus = check.result.status;
  const indexLabel = `${check.index + 1}.`.padEnd(indexWidth);
  const statusLabel = STATUS_LABELS[status].padEnd(LONG_STATUS_WIDTH);
  const combinedLength = project.project.length + 1 + check.name.length;
  const padding = " ".repeat(Math.max(0, projectNameWidth - combinedLength));
  const commandLabel =
    check.command.length > commandWidth
      ? `${check.command.slice(0, commandWidth - 1)}…`
      : check.command.padEnd(commandWidth);
  const durationLabel = formatCheckDurationLabel(check);

  return (
    <Box flexDirection="row">
      <Box flexDirection="row" gap={2}>
        <Text>{indexLabel}</Text>
        <Text color={STATUS_COLORS[status]}>{statusLabel}</Text>
        <Text>
          <Text color={project.color}>{project.project}</Text>
          <Text color="gray">/</Text>
          <Text>{check.name}</Text>
          <Text>{padding}</Text>
        </Text>
        <Text color="gray">{commandLabel}</Text>
      </Box>
      <Spacer />
      {durationLabel ? <Text color="grey">{` ${durationLabel}`}</Text> : null}
    </Box>
  );
}
