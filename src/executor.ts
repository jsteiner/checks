import { type ChildProcess, spawn as defaultSpawn } from "node:child_process";
import type { Environment } from "./input/environment.js";
import type { Input } from "./input/index.js";
import type { ChecksStore } from "./state/ChecksStore.js";
import type { CheckDefinition } from "./types.js";

export type SpawnFunction = (command: string) => ChildProcess;

export interface ExecutorOptions {
  spawn?: SpawnFunction;
}

export async function runChecks(
  input: Input,
  store: ChecksStore,
  signal: AbortSignal,
  options: ExecutorOptions = {},
): Promise<void> {
  const spawnFn = options.spawn ?? createDefaultSpawner(input.environment);
  await Promise.all(
    input.config.checks.map((check, index) =>
      executeSingleCheck(check, index, store, signal, spawnFn),
    ),
  );
}

function executeSingleCheck(
  check: CheckDefinition,
  index: number,
  store: ChecksStore,
  signal: AbortSignal,
  spawnFn: SpawnFunction,
): Promise<void> {
  if (signal.aborted) {
    store.markAborted(index);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let aborted = false;
    let child: ChildProcess | undefined;

    const onAbort = () => {
      aborted = true;
      if (child && !child.killed) {
        child.kill("SIGTERM");
      }
      store.markAborted(index);
    };

    signal.addEventListener("abort", onAbort);

    try {
      child = spawnFn(check.command);
    } catch (error) {
      signal.removeEventListener("abort", onAbort);
      const message = error instanceof Error ? error.message : "Spawn failed";
      store.appendStderr(index, `${message}\n`);
      store.markFailed(index, null, message);
      resolve();
      return;
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      store.appendStdout(index, chunk);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      store.appendStderr(index, chunk);
    });

    child.on("error", (error) => {
      store.appendStderr(index, `${error.message}\n`);
      store.markFailed(index, null, error.message);
      cleanup();
      resolve();
    });

    child.on("close", (code, signalCode) => {
      if (aborted || signal.aborted || signalCode) {
        store.markAborted(index);
      } else if (code === 0) {
        store.markPassed(index, code);
      } else {
        store.markFailed(index, code ?? null, null);
      }
      cleanup();
      resolve();
    });

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };
  });
}

function createDefaultSpawner(env: Environment): SpawnFunction {
  return (command: string) =>
    defaultSpawn(command, {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });
}
