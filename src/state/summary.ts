import type { Summary } from "../types.js";

export function combineSummaries(summaries: Summary[]): Summary {
  return summaries.reduce(
    (tally, summary) => ({
      total: tally.total + summary.total,
      pending: tally.pending + summary.pending,
      passed: tally.passed + summary.passed,
      failed: tally.failed + summary.failed,
      aborted: tally.aborted + summary.aborted,
      durationMs: Math.max(tally.durationMs, summary.durationMs),
    }),
    { total: 0, pending: 0, passed: 0, failed: 0, aborted: 0, durationMs: 0 },
  );
}
