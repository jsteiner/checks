import type {
  CheckDefinition,
  CheckResult,
  CheckState,
  CheckStatus,
  LogEntry,
} from "../types.js";

const TERMINAL_STATUSES: CheckStatus[] = ["passed", "failed", "aborted"];

export class Check {
  readonly index: number;
  readonly name: string;
  readonly command: string;
  readonly startedAt: number;

  private result: CheckResult = { status: "running" };
  private log: LogEntry[] = [];

  constructor(index: number, definition: CheckDefinition, startedAt: number) {
    this.index = index;
    this.name = definition.name;
    this.command = definition.command;
    this.startedAt = startedAt;
  }

  get status(): CheckStatus {
    return this.result.status;
  }

  appendStdout(chunk: Buffer | string): boolean {
    const next = chunk.toString();
    if (!next) return false;
    this.log.push({ text: next });
    return true;
  }

  markPassed(exitCode: number | null): boolean {
    if (this.isTerminal()) return false;
    this.result = {
      status: "passed",
      finishedAt: Date.now(),
      exitCode,
    };
    return true;
  }

  markFailed(exitCode: number | null, errorMessage: string | null): boolean {
    if (this.isTerminal()) return false;
    this.result = {
      status: "failed",
      errorMessage,
      finishedAt: Date.now(),
      exitCode,
    };
    return true;
  }

  markAborted(): boolean {
    if (this.isTerminal()) return false;
    this.result = {
      status: "aborted",
      finishedAt: Date.now(),
    };
    return true;
  }

  toState(): CheckState {
    return {
      index: this.index,
      name: this.name,
      command: this.command,
      startedAt: this.startedAt,
      log: this.cloneLog(),
      result: this.cloneResult(),
    };
  }

  private isTerminal() {
    return TERMINAL_STATUSES.includes(this.result.status);
  }

  private cloneResult(): CheckResult {
    return structuredClone(this.result);
  }

  private cloneLog(): LogEntry[] {
    return this.log.map((entry) => ({ ...entry }));
  }
}
