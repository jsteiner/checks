import pLimit from "p-limit";
import type { Input } from "../input/index.js";
import type { Suite } from "../state/Suite.js";
import type { CheckStatus, TerminalDimensions } from "../types.js";
import { CheckExecutor } from "./CheckExecutor.js";
import { createDefaultSpawner, type SpawnFunction } from "./PtyProcess.js";

export class Executor {
  private readonly abortController = new AbortController();
  private readonly signal = this.abortController.signal;
  private readonly spawnFn: SpawnFunction;
  private readonly stopForwarding: () => void;

  constructor(
    private readonly input: Input,
    private readonly store: Suite,
    parentSignal: AbortSignal,
    private readonly terminalDimensions: TerminalDimensions,
    spawnFn: SpawnFunction = createDefaultSpawner(),
  ) {
    this.spawnFn = spawnFn;
    this.stopForwarding = forwardAbortSignal(
      parentSignal,
      this.abortController,
    );
  }

  async run(): Promise<void> {
    const failFast = this.input.options.failFast;
    const limit = pLimit(this.input.options.concurrency);

    try {
      await Promise.all(
        this.input.projects.flatMap((config, projectIndex) =>
          config.checks.map((_, checkIndex) =>
            limit(() => this.executeSingleCheck(projectIndex, checkIndex)).then(
              (status) => {
                if (failFast && status === "failed" && !this.signal.aborted) {
                  this.abortController.abort();
                }
                return status;
              },
            ),
          ),
        ),
      );
    } finally {
      this.stopForwarding();
    }
  }

  private executeSingleCheck(
    projectIndex: number,
    checkIndex: number,
  ): Promise<CheckStatus> {
    const check = this.store.getCheck(projectIndex, checkIndex);
    const runner = new CheckExecutor(
      this.signal,
      this.terminalDimensions,
      this.spawnFn,
    );
    return runner.run(check);
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
