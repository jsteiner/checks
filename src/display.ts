import type { CheckState, LogEntry, Stream } from "./types.js";

export interface FormatLogOptions {
  stream?: Stream;
  prefix?: string;
}

export function filterLog(log: LogEntry[], stream: Stream | "all"): LogEntry[] {
  if (stream === "all") return log;
  return log.filter((entry) => stream === entry.stream);
}

export function formatDuration(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatCheckDurationLabel(check: CheckState): string | null {
  if (check.result.status === "running") return null;
  const durationMs = Math.max(0, check.result.finishedAt - check.startedAt);
  return formatDuration(durationMs);
}

export function formatLog(
  log: LogEntry[],
  options: FormatLogOptions = {},
): string[] {
  const { stream = "all", prefix = "" } = options;
  const filteredLog = filterLog(log, stream);

  return filteredLog.flatMap((entry) => formatEntry(entry, prefix));
}

const formatEntry = (entry: LogEntry, prefix: string): string[] => {
  const normalizedLines = entry.text.replace(/\r\n?/g, "\n").split("\n");

  return normalizedLines.map((line) => `${prefix}${line}`);
};
