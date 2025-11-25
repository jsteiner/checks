import type { ProjectColor } from "./input/projectColors.js";

export interface CheckDefinition {
  name: string;
  command: string;
}

export interface ProjectDefinition {
  project: string;
  path: string;
  checks: CheckDefinition[];
  color: ProjectColor;
}

export interface LogEntry {
  text: string;
}

export interface CheckState extends CheckDefinition {
  startedAt: number;
  log: LogEntry[];
  result: CheckResult;
}

export interface ProjectState extends ProjectDefinition {
  color: ProjectColor;
  checks: CheckState[];
  summary: Summary;
  isComplete: boolean;
}

export type SuiteDefinition = {
  projects: ProjectDefinition[];
};

export interface SuiteState extends SuiteDefinition {
  projects: ProjectState[];
  summary: Summary;
  isComplete: boolean;
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
