import type { CheckStatus } from "../types.js";

export const STATUS_LABELS: Record<CheckStatus, string> = {
  pending: "pending",
  aborted: "aborted",
  failed: "failed",
  running: "running",
  passed: "passed",
};

export const STATUS_COLORS: Record<CheckStatus, string> = {
  pending: "gray",
  aborted: "gray",
  failed: "red",
  running: "yellow",
  passed: "green",
};

export const LONG_STATUS_WIDTH = Object.values(STATUS_LABELS).reduce(
  (max, label) => Math.max(max, label.length + 1),
  0,
);
