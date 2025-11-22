import { Box, Text, useApp } from "ink";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { formatLog } from "../display.js";
import type { ChecksStore } from "../state/ChecksStore.js";
import type { CheckState, CheckStatus } from "../types.js";

interface AppProps {
  store: ChecksStore;
}

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

export function App({ store }: AppProps) {
  const { exit } = useApp();
  const checks = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const nameWidth = useMemo(
    () => checks.reduce((max, check) => Math.max(max, check.name.length), 0),
    [checks],
  );
  const indexWidth = Math.max(1, String(checks.length).length);
  const indent = indexWidth + 2;
  const allDone = checks.every((check) => check.result.status !== "running");
  const summary = store.summary();

  useEffect(() => {
    if (allDone) {
      exit();
    }
  }, [allDone, exit]);

  return (
    <Box flexDirection="column">
      {checks.map((check) => (
        <Box
          key={check.index}
          flexDirection="column"
          marginBottom={check.result.status === "failed" ? 1 : 0}
        >
          <CheckRow
            check={check}
            indexWidth={indexWidth}
            nameWidth={nameWidth}
          />
          {check.result.status === "failed" ? (
            <FailedOutput check={check} indent={indent} />
          ) : null}
        </Box>
      ))}
      {allDone ? (
        <Box marginTop={1}>
          <Text>
            Summary: total {summary.total}, passed {summary.passed}, failed{" "}
            {summary.failed}, aborted {summary.aborted}, elapsed{" "}
            {formatDuration(summary.durationMs)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

interface CheckRowProps {
  check: CheckState;
  indexWidth: number;
  nameWidth: number;
}

function CheckRow({ check, indexWidth, nameWidth }: CheckRowProps) {
  const status = check.result.status;
  const indexLabel = `${check.index + 1}.`.padEnd(indexWidth + 2, " ");
  const statusLabel = STATUS_LABELS[status].padEnd(STATUS_WIDTH, " ");
  const nameLabel = check.name.padEnd(nameWidth, " ");

  return (
    <Box flexDirection="row">
      <Text>{indexLabel}</Text>
      <Text color={STATUS_COLORS[status]}>{statusLabel}</Text>
      <Text> </Text>
      <Text>{nameLabel}</Text>
      <Text> </Text>
      <Text color="gray">{check.command}</Text>
    </Box>
  );
}

interface FailedOutputProps {
  check: CheckState;
  indent: number;
}

function FailedOutput({ check, indent }: FailedOutputProps) {
  const log = formatLog(check.log, { prefix: " ".repeat(indent) });
  const lines = log ? log.split("\n") : [];

  return (
    <Box flexDirection="column">
      {lines.map((line, index) => (
        <Text key={`${check.index}-line-${index}`}>{line}</Text>
      ))}
    </Box>
  );
}

function formatDuration(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}
