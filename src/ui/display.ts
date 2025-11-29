import type { CheckState } from "../types.js";

export function formatDuration(ms: number) {
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatCheckDurationLabel(check: CheckState): string | null {
  if (check.result.status === "pending" || check.result.status === "running") {
    return null;
  }
  if (check.startedAt === null) {
    return null;
  }
  const durationMs = Math.max(0, check.result.finishedAt - check.startedAt);
  return formatDuration(durationMs);
}
