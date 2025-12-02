import { EventEmitter } from "node:events";
import type { SuiteDefinition, SuiteState } from "../types.js";
import type { Check } from "./Check.js";
import { createWaitForCompletion } from "./eventEmitterHelper.js";
import { Project } from "./Project.js";
import { combineSummaries } from "./summary.js";

export interface SuiteUpdateEvent {
  eventType: "status" | "output";
  checkIndex: number;
}

export class Suite {
  private readonly emitter = new EventEmitter();
  private readonly projects: Project[];
  private snapshot: SuiteState;

  constructor(definition: SuiteDefinition) {
    let checkOffset = 0;
    this.projects = definition.projects.map((project) => {
      const created = new Project(project, checkOffset);
      checkOffset += project.checks.length;
      return created;
    });
    this.snapshot = this.createState();
    this.projects.forEach((project) => {
      project.subscribe((event) => this.emit({ ...event }));
    });
    this.waitForCompletion = createWaitForCompletion(
      this.emitter,
      this.isComplete.bind(this),
    );
  }

  subscribe = (listener: (event: SuiteUpdateEvent) => void) => {
    this.emitter.on("update", listener);
    return () => this.emitter.off("update", listener);
  };

  getCheck(projectIndex: number, checkIndex: number): Check {
    const store = this.projects[projectIndex];
    if (!store) {
      throw new Error(`Project not found for index ${projectIndex}`);
    }
    return store.getCheck(checkIndex);
  }

  waitForCompletion: () => Promise<void>;

  toState = (): SuiteState => this.snapshot;

  private emit(event: SuiteUpdateEvent) {
    this.snapshot = this.createState();
    this.emitter.emit("update", event);
  }

  private isComplete() {
    return this.projects.every((store) => store.isComplete());
  }

  private createState(): SuiteState {
    const projects = this.projects.map((store) => store.toState());
    return {
      projects,
      summary: combineSummaries(
        projects.map((projectState) => projectState.summary),
      ),
      isComplete: projects.every((project) => project.isComplete),
    };
  }
}
