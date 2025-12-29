import type {
  CheckDefinition,
  CheckResult,
  CheckState,
  CheckStatus,
  Summary,
} from "../types.js";

const TERMINAL_STATUSES: CheckStatus[] = ["passed", "failed", "aborted"];

export class Check {
  readonly name: string;
  readonly command: string;
  readonly cwd: string;
  readonly timeout?: CheckDefinition["timeout"];
  readonly index: number;
  startedAt: number | null = null;

  private _result: CheckResult = { status: "pending" };
  private _output = "";
  private readonly onUpdate: (eventType: "status" | "output") => void;

  constructor(
    definition: CheckDefinition,
    index: number,
    onUpdate: (eventType: "status" | "output") => void = () => {},
  ) {
    this.name = definition.name;
    this.command = definition.command;
    this.cwd = definition.cwd;
    this.timeout = definition.timeout;
    this.index = index;
    this.onUpdate = onUpdate;
  }

  get status(): CheckStatus {
    return this._result.status;
  }

  get result(): CheckResult {
    return this.cloneResult();
  }

  get output(): string {
    return this._output;
  }

  get finishedAt(): number | null {
    if (
      this._result.status === "pending" ||
      this._result.status === "running"
    ) {
      return null;
    }
    return this._result.finishedAt;
  }

  isComplete(): boolean {
    return this.isTerminal();
  }

  setOutput(text: string): boolean {
    if (this._output === text) return false;
    this._output = text;
    this.onUpdate("output");
    return true;
  }

  setResult(result: CheckResult): void {
    this._result = result;
    this.onUpdate("status");
  }

  markRunning(): boolean {
    if (this.isTerminal()) return false;
    this.startedAt = Date.now();
    this._result = { status: "running" };
    this.onUpdate("status");
    return true;
  }

  markPassed(exitCode: number | null): boolean {
    if (this.isTerminal()) return false;
    this._result = {
      status: "passed",
      finishedAt: Date.now(),
      exitCode,
    };
    this.onUpdate("status");
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
    this.onUpdate("status");
    return true;
  }

  markAborted(): boolean {
    if (this.isTerminal()) return false;
    this._result = {
      status: "aborted",
      finishedAt: Date.now(),
    };
    this.onUpdate("status");
    return true;
  }

  toState(): CheckState {
    return {
      name: this.name,
      command: this.command,
      cwd: this.cwd,
      ...(this.timeout ? { timeout: this.timeout } : {}),
      index: this.index,
      startedAt: this.startedAt,
      output: this.output,
      result: this.cloneResult(),
    };
  }

  summary(): Summary {
    const durationMs =
      this.finishedAt === null || this.startedAt === null
        ? 0
        : this.finishedAt - this.startedAt;
    return {
      total: 1,
      pending: this.status === "pending" ? 1 : 0,
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
}
