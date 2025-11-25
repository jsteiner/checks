import { EventEmitter } from "node:events";
import type { SuiteDefinition, SuiteState } from "../types.js";
import type { Check } from "./Check.js";
import { Project } from "./Project.js";
import { combineSummaries } from "./summary.js";

export class Suite {
  private readonly emitter = new EventEmitter();
  private readonly projects: Project[];
  private snapshot: SuiteState;

  constructor(definition: SuiteDefinition, startedAt: number) {
    this.projects = definition.projects.map(
      (project, index) => new Project(project, index, startedAt),
    );
    this.snapshot = this.createState();
    this.projects.forEach((store) => {
      store.subscribe(() => this.emit());
    });
  }

  subscribe = (listener: () => void) => {
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

  toState = (): SuiteState => this.snapshot;

  private emit() {
    this.snapshot = this.createState();
    this.emitter.emit("update");
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

export type { ProjectState, SuiteState } from "../types.js";
