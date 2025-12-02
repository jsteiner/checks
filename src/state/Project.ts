import { EventEmitter } from "node:events";
import type { ProjectColor } from "../input/projectColors.js";
import type { ProjectDefinition, ProjectState, Summary } from "../types.js";
import { Check } from "./Check.js";
import { createWaitForCompletion } from "./eventEmitterHelper.js";
import { combineSummaries } from "./summary.js";

interface ProjectUpdateEvent {
  eventType: "status" | "output";
  checkIndex: number;
}

export class Project {
  readonly project: string;
  readonly path: string;
  readonly color: ProjectColor;
  readonly startIndex: number;

  private readonly emitter = new EventEmitter();
  private readonly checks: Check[];

  constructor(project: ProjectDefinition, startIndex: number) {
    this.project = project.project;
    this.path = project.path;
    this.color = project.color;
    this.startIndex = startIndex;
    this.checks = project.checks.map((definition, checkIndex) => {
      const index = this.startIndex + checkIndex;
      return new Check(definition, index, (eventType) =>
        this.handleCheckUpdate(eventType, index),
      );
    });
    this.waitForCompletion = createWaitForCompletion(
      this.emitter,
      this.isComplete.bind(this),
    );
  }

  subscribe = (listener: (event: ProjectUpdateEvent) => void) => {
    this.emitter.on("update", listener);
    return () => this.emitter.off("update", listener);
  };

  private handleCheckUpdate = (
    eventType: "status" | "output",
    checkIndex: number,
  ) => {
    this.emit({ eventType, checkIndex });
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

  private emit(event: ProjectUpdateEvent) {
    this.emitter.emit("update", event);
  }

  isComplete() {
    return this.checks.every((check) => check.isComplete());
  }
}
