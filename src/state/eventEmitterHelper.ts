import type { EventEmitter } from "node:events";

export function createWaitForCompletion(
  emitter: EventEmitter,
  isComplete: () => boolean,
): () => Promise<void> {
  return () => {
    if (isComplete()) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const listener = () => {
        if (!isComplete()) return;
        emitter.off("update", listener);
        resolve();
      };

      emitter.on("update", listener);
    });
  };
}
