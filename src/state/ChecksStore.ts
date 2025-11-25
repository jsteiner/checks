import { EventEmitter } from "node:events";
import type { CheckDefinition, CheckState, Summary } from "../types.js";
import { Check } from "./Check.js";

export class ChecksStore {
  private readonly emitter = new EventEmitter();
  private readonly startedAt: number;
  private checks: Check[];
  private snapshot: CheckState[];

  constructor(definitions: CheckDefinition[], startedAt: number) {
    this.startedAt = startedAt;
    this.checks = definitions.map(
      (definition, index) => new Check(index, definition, startedAt),
    );
    this.snapshot = this.createSnapshot();
  }

  subscribe = (listener: () => void) => {
    this.emitter.on("update", listener);
    return () => this.emitter.off("update", listener);
  };

  getSnapshot = (): CheckState[] => this.snapshot;

  appendStdout(index: number, chunk: Buffer | string) {
    const check = this.getCheckOrThrow(index);
    if (check.appendStdout(chunk)) {
      this.emit();
    }
  }

  markPassed(index: number, exitCode: number | null) {
    const check = this.getCheckOrThrow(index);
    if (check.markPassed(exitCode)) {
      this.emit();
    }
  }

  markFailed(
    index: number,
    exitCode: number | null,
    errorMessage: string | null,
  ) {
    const check = this.getCheckOrThrow(index);
    if (check.markFailed(exitCode, errorMessage)) {
      this.emit();
    }
  }

  markAborted(index: number) {
    const check = this.getCheckOrThrow(index);
    if (check.markAborted()) {
      this.emit();
    }
  }

  summary(): Summary {
    const total = this.checks.length;
    let lastFinishedAt: number | null = null;
    const { passed, failed, aborted } = this.checks.reduce(
      (tally, check) => {
        switch (check.status) {
          case "passed":
            tally.passed += 1;
            break;
          case "failed":
            tally.failed += 1;
            break;
          case "aborted":
            tally.aborted += 1;
            break;
        }
        if (check.finishedAt !== null) {
          lastFinishedAt =
            lastFinishedAt === null
              ? check.finishedAt
              : Math.max(lastFinishedAt, check.finishedAt);
        }
        return tally;
      },
      { passed: 0, failed: 0, aborted: 0 },
    );

    const durationMs =
      lastFinishedAt === null ? 0 : lastFinishedAt - this.startedAt;

    return {
      total,
      passed,
      failed,
      aborted,
      durationMs,
    };
  }

  waitForCompletion(): Promise<CheckState[]> {
    if (this.isComplete()) {
      return Promise.resolve(this.getSnapshot());
    }

    return new Promise((resolve) => {
      const listener = () => {
        if (!this.isComplete()) return;
        this.emitter.off("update", listener);
        resolve(this.getSnapshot());
      };

      this.emitter.on("update", listener);
    });
  }

  private emit() {
    this.snapshot = this.createSnapshot();
    this.emitter.emit("update");
  }

  private isComplete() {
    return this.checks.every((check) => check.status !== "running");
  }

  private createSnapshot(): CheckState[] {
    return this.checks.map((check) => check.toState());
  }

  private getCheckOrThrow(index: number): Check {
    const check = this.checks[index];
    if (!check) {
      throw new Error(`Check not found for index ${index}`);
    }
    return check;
  }
}
