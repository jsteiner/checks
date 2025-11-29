import { Box, Spacer, Text } from "ink";
import type { CheckState, CheckStatus, ProjectState } from "../../types.js";
import { formatCheckDurationLabel } from "../display.js";
import { useLayout } from "../LayoutContext.js";
import { LONG_STATUS_WIDTH, STATUS_COLORS, STATUS_LABELS } from "../status.js";

interface CheckHeaderProps {
  project: ProjectState;
  check: CheckState;
  index: number;
}

export function CheckHeader({ project, check, index }: CheckHeaderProps) {
  const { indexWidth, nameWidth, commandWidth } = useLayout();
  const status: CheckStatus = check.result.status;
  const indexLabel = `${index + 1}.`.padEnd(indexWidth, " ");
  const statusLabel = STATUS_LABELS[status].padEnd(LONG_STATUS_WIDTH, " ");
  const nameLabel = check.name.padEnd(nameWidth, " ");
  const commandLabel = check.command.padEnd(commandWidth, " ");
  const durationLabel = formatCheckDurationLabel(check);

  return (
    <Box flexDirection="row">
      <Box flexDirection="row" gap={2}>
        <Text>{indexLabel}</Text>
        <Text color={STATUS_COLORS[status]}>{statusLabel}</Text>
        <Text>
          <Text color={project.color}>{project.project}</Text>
          <Text color="gray">/</Text>
          <Text>{nameLabel}</Text>
        </Text>
        <Text color="gray">{commandLabel}</Text>
      </Box>
      <Spacer />
      {durationLabel ? <Text color="grey">{` ${durationLabel}`}</Text> : null}
    </Box>
  );
}
