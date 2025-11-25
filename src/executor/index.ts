import type { Input } from "../input/index.js";
import type { ChecksStore } from "../state/ChecksStore.js";
import type { CheckDefinition, CheckStatus } from "../types.js";
import { CheckExecutor } from "./CheckExecutor.js";
import { createDefaultSpawner, type SpawnFunction } from "./PtyProcess.js";

export class Executor {
  private readonly abortController = new AbortController();
  private readonly signal = this.abortController.signal;
  private readonly spawnFn: SpawnFunction;
  private readonly stopForwarding: () => void;

  constructor(
    private readonly input: Input,
    private readonly store: ChecksStore,
    parentSignal: AbortSignal,
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
    const runner = new CheckExecutor(this.store, this.signal, this.spawnFn);
    return runner.run(check, index);
  }
}

export type { SpawnedProcess, SpawnFunction } from "./PtyProcess.js";
export { createDefaultSpawner } from "./PtyProcess.js";

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
