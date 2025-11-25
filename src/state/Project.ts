import { EventEmitter } from "node:events";
import type { ProjectDefinition, ProjectState, Summary } from "../types.js";
import { Check } from "./Check.js";
import { combineSummaries } from "./summary.js";

export class Project {
  readonly project: string;
  readonly path: string;
  readonly index: number;

  private readonly emitter = new EventEmitter();
  private readonly checks: Check[];
  private readonly handleCheckUpdate = () => {
    this.emit();
  };

  constructor(
    project: ProjectDefinition,
    projectIndex: number,
    startedAt: number,
  ) {
    this.project = project.project;
    this.path = project.path;
    this.index = projectIndex;
    this.checks = project.checks.map(
      (definition) => new Check(definition, startedAt, this.handleCheckUpdate),
    );
  }

  subscribe = (listener: () => void) => {
    this.emitter.on("update", listener);
    return () => this.emitter.off("update", listener);
  };

  getCheck(index: number): Check {
    const check = this.checks[index];
    if (!check) {
      throw new Error(`Check not found for index ${index}`);
    }
    return check;
  }

  summary(): Summary {
    return combineSummaries(this.checks.map((check) => check.summary()));
  }

  waitForCompletion(): Promise<void> {
    if (this.isComplete()) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const listener = () => {
        if (!this.isComplete()) return;
        this.emitter.off("update", listener);
        resolve();
      };

      this.emitter.on("update", listener);
    });
  }

  toState(): ProjectState {
    return {
      project: this.project,
      path: this.path,
      checks: this.checks.map((check) => check.toState()),
      summary: this.summary(),
      isComplete: this.isComplete(),
    };
  }

  private emit() {
    this.emitter.emit("update");
  }

  isComplete() {
    return this.checks.every((check) => check.isComplete());
  }
}
