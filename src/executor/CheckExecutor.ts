import type { ChildProcess } from "node:child_process";
import type { ChecksStore } from "../state/ChecksStore.js";
import type { CheckDefinition, CheckStatus } from "../types.js";
import type { SpawnFunction } from "./index.js";

export class CheckExecutor {
  private aborted = false;
  private child: ChildProcess | undefined;

  constructor(
    private readonly store: ChecksStore,
    private readonly signal: AbortSignal,
    private readonly spawnFn: SpawnFunction,
    private readonly process: Pick<NodeJS.Process, "kill" | "platform">,
  ) {}

  run(check: CheckDefinition, index: number): Promise<CheckStatus> {
    if (this.signal.aborted) {
      this.store.markAborted(index);
      return Promise.resolve("aborted");
    }

    return new Promise((resolve) => {
      const onAbort = () => {
        this.aborted = true;
        this.attemptKill("SIGTERM");
        this.store.markAborted(index);
      };

      this.signal.addEventListener("abort", onAbort);

      const cleanup = () => {
        this.signal.removeEventListener("abort", onAbort);
      };

      try {
        this.child = this.spawnFn(check.command);
      } catch (error) {
        cleanup();
        const message = error instanceof Error ? error.message : "Spawn failed";
        this.store.appendStderr(index, `${message}\n`);
        this.store.markFailed(index, null, message);
        resolve("failed");
        return;
      }

      this.child.stdout?.on("data", (chunk: Buffer) => {
        this.store.appendStdout(index, chunk);
      });

      this.child.stderr?.on("data", (chunk: Buffer) => {
        this.store.appendStderr(index, chunk);
      });

      this.child.on("error", (error) => {
        this.store.appendStderr(index, `${error.message}\n`);
        this.store.markFailed(index, null, error.message);
        cleanup();
        resolve("failed");
      });

      this.child.on("close", (code, signalCode) => {
        let status: CheckStatus = "running";
        if (this.aborted || this.signal.aborted || signalCode) {
          this.store.markAborted(index);
          status = "aborted";
        } else if (code === 0) {
          this.store.markPassed(index, code);
          status = "passed";
        } else {
          this.store.markFailed(index, code ?? null, null);
          status = "failed";
        }
        cleanup();
        resolve(status);
      });
    });
  }

  private attemptKill(signalName: NodeJS.Signals) {
    if (!this.child) return;

    const pid = this.child.pid;
    if (pid && this.process.platform !== "win32") {
      try {
        // Try to kill the whole process group; this covers grandchildren created
        // under the same session (e.g., a pnpm script or shell wrapper that
        // spawns further processes).
        this.process.kill(-pid, signalName);
        return;
      } catch {
        // If the group does not exist (already exited) or cannot be signaled,
        // fall back to killing just the child.
      }
    }

    if (this.child.killed) return;
    try {
      this.child.kill(signalName);
    } catch {
      // The child may have already exited; killing is best-effort during teardown.
    }
  }
}
