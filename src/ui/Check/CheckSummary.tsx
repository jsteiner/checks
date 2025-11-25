import { Box, Spacer, Text } from "ink";
import { formatCheckDurationLabel } from "../../display.js";
import type { CheckState, CheckStatus } from "../../types.js";
import { useLayout } from "../LayoutContext.js";
import { LONG_STATUS_WIDTH, STATUS_COLORS, STATUS_LABELS } from "../status.js";

interface CheckSummaryProps {
  check: CheckState;
  index: number;
}

export function CheckSummary({ check, index }: CheckSummaryProps) {
  const { indexWidth, nameWidth, commandWidth } = useLayout();
  const status: CheckStatus = check.result.status;
  const indexLabel = `${index + 1}.`.padEnd(indexWidth + 2, " ");
  const statusLabel = STATUS_LABELS[status].padEnd(LONG_STATUS_WIDTH, " ");
  const nameLabel = check.name.padEnd(nameWidth, " ");
  const commandLabel = check.command.padEnd(commandWidth, " ");
  const durationLabel = formatCheckDurationLabel(check);

  return (
    <Box flexDirection="row">
      <Text>{indexLabel}</Text>
      <Text color={STATUS_COLORS[status]}>{statusLabel}</Text>
      <Text> </Text>
      <Text>{nameLabel}</Text>
      <Text> </Text>
      <Text color="gray">{commandLabel}</Text>
      <Spacer />
      {durationLabel ? <Text color="grey">{` ${durationLabel}`}</Text> : null}
    </Box>
  );
}
