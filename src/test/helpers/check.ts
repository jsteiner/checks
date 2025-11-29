import type {
  CheckResult,
  CheckState,
  ProjectState,
  Summary,
} from "../../types.js";

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

interface CreateProjectOptions {
  project?: string;
  path?: string;
  checks?: CheckState[];
  isComplete?: boolean;
}

export function createProject({
  project = "test",
  path = "/test",
  checks = [],
  isComplete = false,
}: CreateProjectOptions = {}): ProjectState {
  const summary: Summary = {
    total: checks.length,
    pending: checks.filter((c) => c.result.status === "pending").length,
    passed: checks.filter((c) => c.result.status === "passed").length,
    failed: checks.filter((c) => c.result.status === "failed").length,
    aborted: checks.filter((c) => c.result.status === "aborted").length,
    durationMs: 0,
  };

  return {
    project,
    path,
    color: "white",
    checks,
    summary,
    isComplete,
  };
}
