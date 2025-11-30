import { EventEmitter } from "node:events";
import type { ProjectColor } from "../input/projectColors.js";
import type { ProjectDefinition, ProjectState, Summary } from "../types.js";
import { Check } from "./Check.js";
import { createWaitForCompletion } from "./eventEmitterHelper.js";
import { combineSummaries } from "./summary.js";

export class Project {
  readonly project: string;
  readonly path: string;
  readonly index: number;
  readonly color: ProjectColor;

  private readonly emitter = new EventEmitter();
  private readonly checks: Check[];
  private readonly handleCheckUpdate = () => {
    this.emit();
  };

  constructor(project: ProjectDefinition, projectIndex: number) {
    this.project = project.project;
    this.path = project.path;
    this.index = projectIndex;
    this.color = project.color;
    this.checks = project.checks.map(
      (definition) => new Check(definition, this.handleCheckUpdate),
    );
    this.waitForCompletion = createWaitForCompletion(
      this.emitter,
      this.isComplete.bind(this),
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

  waitForCompletion: () => Promise<void>;

  toState(): ProjectState {
    return {
      project: this.project,
      path: this.path,
      color: this.color,
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
