import { EventEmitter } from "node:events";
import type { SpawnedProcess } from "../../executor/PtyProcess.js";

export type FakeSpawnedProcess = SpawnedProcess & {
  emitClose: (code: number | null, signal: NodeJS.Signals | null) => void;
};

type FakeSpawnedProcessOptions = {
  killed?: boolean;
  kill?: (child: FakeSpawnedProcess) => (signal?: NodeJS.Signals) => boolean;
};

export function createFakeSpawnedProcess(
  options: FakeSpawnedProcessOptions = {},
): FakeSpawnedProcess {
  const child = new EventEmitter() as FakeSpawnedProcess;
  let closed = false;

  child.emitClose = (code, signal) => {
    if (closed) return;
    closed = true;
    child.emit("close", code, signal);
  };

  if (options.killed !== undefined) {
    Object.defineProperty(child, "killed", {
      value: options.killed,
      writable: true,
    });
  }

  if (options.kill) {
    child.kill = options.kill(child);
  }

  return child;
}
