export interface CheckDefinition {
  name: string;
  command: string;
}

export type Stream = "stdout" | "stderr";

export interface LogEntry {
  stream: Stream;
  text: string;
}

export interface CheckState extends CheckDefinition {
  index: number;
  startedAt: number;
  log: LogEntry[];
  result: CheckResult;
}

export type CheckResult =
  | {
      status: "running";
    }
  | {
      status: "passed";
      finishedAt: number;
      exitCode: number | null;
    }
  | {
      status: "failed";
      finishedAt: number;
      exitCode: number | null;
      errorMessage: string | null;
    }
  | {
      status: "aborted";
      finishedAt: number;
    };

export type CheckStatus = CheckResult["status"];

export interface Summary {
  total: number;
  passed: number;
  failed: number;
  aborted: number;
  durationMs: number;
}
