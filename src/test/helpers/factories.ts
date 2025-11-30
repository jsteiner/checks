import type { ProjectColor } from "../../input/projectColors.js";
import type {
  CheckResult,
  CheckState,
  ProjectState,
  Summary,
} from "../../types.js";

interface CreateResultOptions {
  status: CheckResult["status"];
  finishedAt?: number;
  exitCode?: number | null | undefined;
  errorMessage?: string | null;
}

function createResult({
  status,
  finishedAt = 0,
  exitCode,
  errorMessage,
}: CreateResultOptions): CheckResult {
  if (status === "running") {
    return { status };
  }

  if (status === "passed") {
    return {
      status,
      finishedAt,
      exitCode: exitCode ?? 0,
    };
  }

  if (status === "failed") {
    return {
      status,
      finishedAt,
      exitCode: exitCode ?? 1,
      errorMessage: errorMessage ?? "Check failed",
    };
  }

  return { status, finishedAt };
}

type CreateCheckOptions =
  | {
      status: CheckResult["status"];
      result?: never;
      output?: string;
      startedAt?: number;
      name?: string;
      command?: string;
      cwd?: string;
    }
  | {
      status?: never;
      result: CheckResult;
      output?: string;
      startedAt?: number;
      name?: string;
      command?: string;
      cwd?: string;
    };

export function createCheck(options: CreateCheckOptions): CheckState {
  const {
    startedAt = 0,
    name = "demo",
    command = "echo hi",
    cwd = "/tmp/project",
    output = "",
  } = options;

  const result = options.result ?? createResult({ status: options.status });

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
  color?: ProjectColor;
  checks?: CheckState[];
  isComplete?: boolean;
  durationMs?: number;
}

export function createProject({
  project = "test",
  path = "/test",
  color = "white",
  checks = [],
  isComplete = false,
  durationMs = 0,
}: CreateProjectOptions = {}): ProjectState {
  const summary: Summary = {
    total: checks.length,
    pending: checks.filter((c) => c.result.status === "pending").length,
    passed: checks.filter((c) => c.result.status === "passed").length,
    failed: checks.filter((c) => c.result.status === "failed").length,
    aborted: checks.filter((c) => c.result.status === "aborted").length,
    durationMs,
  };

  return {
    project,
    path,
    color,
    checks,
    summary,
    isComplete,
  };
}
