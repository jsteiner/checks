import type { ProjectColor } from "./input/projectColors.js";

export interface TerminalDimensions {
  columns: number;
  rows: number;
}

export interface CheckDefinition {
  name: string;
  command: string;
  cwd: string;
}

export interface ProjectDefinition {
  project: string;
  path: string;
  checks: CheckDefinition[];
  color: ProjectColor;
}

export interface CheckState extends CheckDefinition {
  startedAt: number | null;
  output: string;
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
      status: "pending";
    }
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
  pending: number;
  passed: number;
  failed: number;
  aborted: number;
  durationMs: number;
}
