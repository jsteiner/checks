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
    }
  | {
      status?: never;
      result?: never;
      output?: string;
      startedAt?: number;
      name?: string;
      command?: string;
      cwd?: string;
    };

export function createCheck(
  options: CreateCheckOptions = { status: "pending" },
): CheckState {
  const {
    startedAt = 0,
    name = "demo",
    command = "echo hi",
    cwd = "/tmp/project",
    output = "",
  } = options;

  const result =
    options.result ?? createResult({ status: options.status ?? "pending" });

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

interface CreateConfigDataOptions {
  project?: string;
  color?: ProjectColor;
  checks?: Array<{ name: string; command: string }>;
}

export function createConfigData({
  project = "test-project",
  color,
  checks = [{ name: "test", command: "echo test" }],
}: CreateConfigDataOptions = {}): {
  project: string;
  color?: ProjectColor;
  checks: Array<{ name: string; command: string }>;
} {
  return {
    project,
    ...(color && { color }),
    checks,
  };
}
