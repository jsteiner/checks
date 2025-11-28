import type { CheckResult, CheckState } from "../../types.js";

interface CreateCheckOptions {
  status: CheckResult["status"];
  output?: string;
  startedAt?: number;
  finishedAt?: number;
  exitCode?: number | null;
  errorMessage?: string | null;
  name?: string;
  command?: string;
  cwd?: string;
}

export function createCheck({
  status,
  startedAt = 0,
  finishedAt = startedAt,
  exitCode,
  errorMessage = null,
  name = "demo",
  command = "echo hi",
  cwd = "/tmp/project",
  output = "",
}: CreateCheckOptions): CheckState {
  const result: CheckResult =
    status === "running"
      ? { status }
      : status === "passed"
        ? {
            status,
            finishedAt,
            exitCode: exitCode ?? 0,
          }
        : status === "failed"
          ? {
              status,
              finishedAt,
              exitCode: exitCode ?? 1,
              errorMessage,
            }
          : { status, finishedAt };

  return {
    name,
    command,
    cwd,
    startedAt,
    output,
    result,
  };
}
