import { sanitizeOutput } from "../executor/sanitization.js";
import type {
  CheckDefinition,
  CheckResult,
  CheckState,
  CheckStatus,
  LogEntry,
  Summary,
} from "../types.js";

const TERMINAL_STATUSES: CheckStatus[] = ["passed", "failed", "aborted"];

export class Check {
  readonly name: string;
  readonly command: string;
  readonly cwd: string | undefined;
  readonly startedAt: number;

  private _result: CheckResult = { status: "running" };
  private _log: LogEntry[] = [];
  private readonly onUpdate: () => void;

  constructor(
    definition: CheckDefinition,
    startedAt: number,
    onUpdate: () => void = () => {},
  ) {
    this.name = definition.name;
    this.command = definition.command;
    this.cwd = definition.cwd;
    this.startedAt = startedAt;
    this.onUpdate = onUpdate;
  }

  get status(): CheckStatus {
    return this._result.status;
  }

  get result(): CheckResult {
    return this.cloneResult();
  }

  get log(): LogEntry[] {
    return this.cloneLog();
  }

  get finishedAt(): number | null {
    if (this._result.status === "running") return null;
    return this._result.finishedAt;
  }

  isComplete(): boolean {
    return this.isTerminal();
  }

  appendStdout(chunk: Buffer | string): boolean {
    const sanitized = sanitizeOutput(chunk.toString());
    if (!sanitized) return false;
    this._log.push({ text: sanitized });
    this.onUpdate();
    return true;
  }

  markPassed(exitCode: number | null): boolean {
    if (this.isTerminal()) return false;
    this._result = {
      status: "passed",
      finishedAt: Date.now(),
      exitCode,
    };
    this.onUpdate();
    return true;
  }

  markFailed(exitCode: number | null, errorMessage: string | null): boolean {
    if (this.isTerminal()) return false;
    this._result = {
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
    this._result = {
      status: "aborted",
      finishedAt: Date.now(),
    };
    this.onUpdate();
    return true;
  }

  toState(): CheckState {
    const state: CheckState = {
      name: this.name,
      command: this.command,
      startedAt: this.startedAt,
      log: this.cloneLog(),
      result: this.cloneResult(),
    };

    if (this.cwd) {
      state.cwd = this.cwd;
    }

    return state;
  }

  summary(): Summary {
    const durationMs =
      this.finishedAt === null ? 0 : this.finishedAt - this.startedAt;
    return {
      total: 1,
      passed: this.status === "passed" ? 1 : 0,
      failed: this.status === "failed" ? 1 : 0,
      aborted: this.status === "aborted" ? 1 : 0,
      durationMs,
    };
  }

  private isTerminal() {
    return TERMINAL_STATUSES.includes(this._result.status);
  }

  private cloneResult(): CheckResult {
    return structuredClone(this._result);
  }

  private cloneLog(): LogEntry[] {
    return this._log.map((entry) => ({ ...entry }));
  }
}
