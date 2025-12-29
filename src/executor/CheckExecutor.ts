import type { Check } from "../state/Check.js";
import type {
  CheckStatus,
  TerminalDimensions,
  TimeoutAction,
} from "../types.js";
import { OutputManager } from "./OutputManager.js";
import type { SpawnedProcess, SpawnFunction } from "./PtyProcess.js";

const DEFAULT_TIMEOUT_SIGNAL: NodeJS.Signals = "SIGTERM";
const DEFAULT_TIMEOUT_ACTION: TimeoutAction = "failed";

function formatTimeoutMessage(timeoutMs: number) {
  return `Timed out after ${timeoutMs}ms`;
}

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
      let resolved = false;
      let timeoutId: NodeJS.Timeout | undefined;
      let killTimeoutId: NodeJS.Timeout | undefined;

      const onAbort = () => {
        this.aborted = true;
        this.attemptKill("SIGTERM");
        check.markAborted();
      };

      this.signal.addEventListener("abort", onAbort);

      const clearTimeouts = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (killTimeoutId) clearTimeout(killTimeoutId);
      };

      const resolveOnce = (status: CheckStatus) => {
        if (resolved) return;
        resolved = true;
        resolve(status);
      };

      const cleanup = () => {
        this.signal.removeEventListener("abort", onAbort);
        clearTimeouts();
        outputManager.dispose();
      };

      const onResize = (columns: number, rows: number) => {
        const newOutput = outputManager.resize(columns, rows);
        if (newOutput) {
          check.setOutput(newOutput);
        }
      };

      const finalizeIfTerminal = () => {
        if (check.status === "pending" || check.status === "running") {
          return false;
        }
        cleanup();
        resolveOnce(check.status);
        return true;
      };

      const handleTimeout = async () => {
        const timeout = check.timeout;
        if (!timeout || check.status !== "running") return;
        const message = formatTimeoutMessage(timeout.ms);
        const newOutput = await outputManager.appendChunk(`\n${message}\n`);
        if (newOutput) {
          check.setOutput(newOutput);
        }
        if ((timeout.onTimeout ?? DEFAULT_TIMEOUT_ACTION) === "aborted") {
          check.markAborted();
        } else {
          check.markFailed(null, message);
        }
        this.attemptKill(timeout.signal ?? DEFAULT_TIMEOUT_SIGNAL);
        if (timeout.killAfterMs !== undefined) {
          killTimeoutId = setTimeout(() => {
            this.attemptKill("SIGKILL");
          }, timeout.killAfterMs);
        }
      };

      try {
        this.child = this.spawnFn(check.command, check.cwd, onResize);
        check.markRunning();
        if (check.timeout) {
          timeoutId = setTimeout(() => {
            void handleTimeout();
          }, check.timeout.ms);
        }
      } catch (error) {
        cleanup();
        const message = error instanceof Error ? error.message : "Spawn failed";
        check.markFailed(null, message);
        resolveOnce("failed");
        return;
      }

      this.child.stdout?.on("data", async (chunk: Buffer) => {
        const newOutput = await outputManager.appendChunk(chunk);
        if (newOutput) {
          check.setOutput(newOutput);
        }
      });

      this.child.on("error", async (error) => {
        if (finalizeIfTerminal()) return;
        const newOutput = await outputManager.appendChunk(`${error.message}\n`);
        if (newOutput) {
          check.setOutput(newOutput);
        }
        check.markFailed(null, error.message);
        cleanup();
        resolveOnce("failed");
      });

      this.child.on("close", (code, signalCode) => {
        if (finalizeIfTerminal()) return;
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
        resolveOnce(status);
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
