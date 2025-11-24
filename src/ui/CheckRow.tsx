import { Box, Text } from "ink";
import { formatCheckDurationLabel } from "../display.js";
import type { CheckState, CheckStatus } from "../types.js";

const STATUS_LABELS: Record<CheckStatus, string> = {
  aborted: "aborted",
  failed: "failed",
  running: "running",
  passed: "passed",
};

const STATUS_WIDTH = Object.values(STATUS_LABELS).reduce(
  (max, label) => Math.max(max, label.length + 1),
  0,
);

const STATUS_COLORS: Record<CheckStatus, string> = {
  aborted: "gray",
  failed: "red",
  running: "yellow",
  passed: "green",
};

interface CheckRowProps {
  check: CheckState;
  indexWidth: number;
  nameWidth: number;
  commandWidth: number;
}

export function CheckRow({
  check,
  indexWidth,
  nameWidth,
  commandWidth,
}: CheckRowProps) {
  const status = check.result.status;
  const indexLabel = `${check.index + 1}.`.padEnd(indexWidth + 2, " ");
  const statusLabel = STATUS_LABELS[status].padEnd(STATUS_WIDTH, " ");
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
      {durationLabel ? <Text color="white">{` ${durationLabel}`}</Text> : null}
    </Box>
  );
}
