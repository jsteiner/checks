export function createCloseEventPromise<
  T extends {
    on: (event: string, handler: (...args: unknown[]) => void) => void;
  },
>(child: T): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve) => {
    child.on("close", (code: unknown, signal: unknown) =>
      resolve({
        code: code as number | null,
        signal: signal as NodeJS.Signals | null,
      }),
    );
  });
}
