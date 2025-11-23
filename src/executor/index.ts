import { type ChildProcess, spawn as defaultSpawn } from "node:child_process";
import nodeProcess from "node:process";
import type { Environment } from "../input/environment.js";
import type { Input } from "../input/index.js";
import type { ChecksStore } from "../state/ChecksStore.js";
import type { CheckDefinition, CheckStatus } from "../types.js";
import { CheckExecutor } from "./CheckExecutor.js";

export type SpawnFunction = (command: string) => ChildProcess;

export interface ExecutorOptions {
  spawn?: SpawnFunction;
  process?: Pick<typeof nodeProcess, "kill" | "platform">;
}

export class Executor {
  private readonly abortController = new AbortController();
  private readonly signal = this.abortController.signal;
  private readonly spawnFn: SpawnFunction;
  private readonly process: Pick<typeof nodeProcess, "kill" | "platform">;
  private readonly stopForwarding: () => void;

  constructor(
    private readonly input: Input,
    private readonly store: ChecksStore,
    parentSignal: AbortSignal,
    options: ExecutorOptions = {},
  ) {
    this.spawnFn =
      options.spawn ?? createDefaultSpawner(this.input.environment);
    this.process = options.process ?? nodeProcess;
    this.stopForwarding = forwardAbortSignal(
      parentSignal,
      this.abortController,
    );
  }

  async run(): Promise<void> {
    const failFast = this.input.options.failFast;
    try {
      await Promise.all(
        this.input.config.checks.map((check, index) =>
          this.executeSingleCheck(check, index).then((status) => {
            if (failFast && status === "failed" && !this.signal.aborted) {
              this.abortController.abort();
            }
            return status;
          }),
        ),
      );
    } finally {
      this.stopForwarding();
    }
  }

  private executeSingleCheck(
    check: CheckDefinition,
    index: number,
  ): Promise<CheckStatus> {
    const runner = new CheckExecutor(
      this.store,
      this.signal,
      this.spawnFn,
      this.process,
    );
    return runner.run(check, index);
  }
}

function forwardAbortSignal(
  source: AbortSignal,
  target: AbortController,
): () => void {
  if (source.aborted && !target.signal.aborted) {
    target.abort();
  }

  const onAbort = () => {
    if (!target.signal.aborted) {
      target.abort();
    }
  };

  source.addEventListener("abort", onAbort);

  return () => {
    source.removeEventListener("abort", onAbort);
  };
}

function createDefaultSpawner(env: Environment): SpawnFunction {
  return (command: string) =>
    defaultSpawn(command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
      env,
    });
}
