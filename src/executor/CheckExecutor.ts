import type { Check } from "../state/Check.js";
import type { CheckStatus, TerminalDimensions } from "../types.js";
import { OutputManager } from "./OutputManager.js";
import type { SpawnedProcess, SpawnFunction } from "./PtyProcess.js";

export class CheckExecutor {
  private aborted = false;
  private child: SpawnedProcess | undefined;

  constructor(
    private readonly signal: AbortSignal,
    private readonly terminalDimensions: TerminalDimensions,
    private readonly spawnFn: SpawnFunction,
  ) {}

  run(check: Check): Promise<CheckStatus> {
    if (this.signal.aborted) {
      check.markAborted();
      return Promise.resolve("aborted");
    }

    const outputManager = new OutputManager(this.terminalDimensions);

    return new Promise((resolve) => {
      const onAbort = () => {
        this.aborted = true;
        this.attemptKill("SIGTERM");
        check.markAborted();
      };

      this.signal.addEventListener("abort", onAbort);

      const cleanup = () => {
        this.signal.removeEventListener("abort", onAbort);
        outputManager.dispose();
      };

      const onResize = (columns: number, rows: number) => {
        const newOutput = outputManager.resize(columns, rows);
        if (newOutput) {
          check.setOutput(newOutput);
        }
      };

      try {
        this.child = this.spawnFn(check.command, check.cwd, onResize);
        check.markRunning();
      } catch (error) {
        cleanup();
        const message = error instanceof Error ? error.message : "Spawn failed";
        check.markFailed(null, message);
        resolve("failed");
        return;
      }

      this.child.stdout?.on("data", async (chunk: Buffer) => {
        const newOutput = await outputManager.appendChunk(chunk);
        if (newOutput) {
          check.setOutput(newOutput);
        }
      });

      this.child.on("error", async (error) => {
        const newOutput = await outputManager.appendChunk(`${error.message}\n`);
        if (newOutput) {
          check.setOutput(newOutput);
        }
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
