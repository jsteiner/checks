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
  private readonly onUpdate: () => void;

  constructor(
    index: number,
    definition: CheckDefinition,
    startedAt: number,
    onUpdate: () => void = () => {},
  ) {
    this.index = index;
    this.name = definition.name;
    this.command = definition.command;
    this.startedAt = startedAt;
    this.onUpdate = onUpdate;
  }

  get status(): CheckStatus {
    return this.result.status;
  }

  get finishedAt(): number | null {
    if (this.result.status === "running") return null;
    return this.result.finishedAt;
  }

  appendStdout(chunk: Buffer | string): boolean {
    const next = chunk.toString();
    if (!next) return false;
    this.log.push({ text: next });
    this.onUpdate();
    return true;
  }

  markPassed(exitCode: number | null): boolean {
    if (this.isTerminal()) return false;
    this.result = {
      status: "passed",
      finishedAt: Date.now(),
      exitCode,
    };
    this.onUpdate();
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
    this.onUpdate();
    return true;
  }

  markAborted(): boolean {
    if (this.isTerminal()) return false;
    this.result = {
      status: "aborted",
      finishedAt: Date.now(),
    };
    this.onUpdate();
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
