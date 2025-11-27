import type { Check } from "../state/Check.js";
import type { CheckStatus } from "../types.js";
import type { SpawnedProcess, SpawnFunction } from "./PtyProcess.js";

export class CheckExecutor {
  private aborted = false;
  private child: SpawnedProcess | undefined;

  constructor(
    private readonly signal: AbortSignal,
    private readonly spawnFn: SpawnFunction,
  ) {}

  run(check: Check): Promise<CheckStatus> {
    if (this.signal.aborted) {
      check.markAborted();
      return Promise.resolve("aborted");
    }

    return new Promise((resolve) => {
      const onAbort = () => {
        this.aborted = true;
        this.attemptKill("SIGTERM");
        check.markAborted();
      };

      this.signal.addEventListener("abort", onAbort);

      const cleanup = () => {
        this.signal.removeEventListener("abort", onAbort);
      };

      try {
        this.child = this.spawnFn(check.command, check.cwd);
      } catch (error) {
        cleanup();
        const message = error instanceof Error ? error.message : "Spawn failed";
        check.appendStdout(`${message}\n`);
        check.markFailed(null, message);
        resolve("failed");
        return;
      }

      this.child.stdout?.on("data", (chunk: Buffer) => {
        check.appendStdout(chunk);
      });

      this.child.on("error", (error) => {
        check.appendStdout(`${error.message}\n`);
        check.markFailed(null, error.message);
        cleanup();
        resolve("failed");
      });

      this.child.on("close", (code, signalCode) => {
        let status: CheckStatus = "running";
        if (this.aborted || this.signal.aborted || signalCode) {
          check.markAborted();
          status = "aborted";
        } else if (code === 0) {
          check.markPassed(code);
          status = "passed";
        } else {
          check.markFailed(code ?? null, null);
          status = "failed";
        }
        cleanup();
        resolve(status);
      });
    });
  }

  private attemptKill(signalName: NodeJS.Signals) {
    if (!this.child || this.child.killed || !this.child.kill) return;
    try {
      this.child.kill(signalName);
    } catch {
      // The child may have already exited; killing is best-effort during teardown.
    }
  }
}
