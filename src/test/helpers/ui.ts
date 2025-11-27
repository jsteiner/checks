import assert from "node:assert/strict";
import type { render } from "ink-testing-library";

type InkInstance = ReturnType<typeof render>;

export async function tick() {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

export async function waitFor(
  condition: () => boolean,
  timeoutMs = 250,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      assert.fail("Timed out while waiting for condition");
    }
    await tick();
  }
}

export async function waitForFrameMatch(
  ink: InkInstance,
  regex: RegExp,
  options: { timeoutMs?: number; stripAnsi?: boolean } = {},
): Promise<string> {
  const { timeoutMs = 250, stripAnsi: shouldStripAnsi = true } = options;
  let frame = "";
  await waitFor(() => {
    frame = ink.lastFrame() ?? "";
    const target = shouldStripAnsi ? stripAnsi(frame) : frame;
    return regex.test(target);
  }, timeoutMs);
  return shouldStripAnsi ? stripAnsi(frame) : frame;
}

export function stripAnsi(value: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: needed to strip ANSI color codes
  return value.replace(/\u001B\[[0-9;]*m/g, "");
}
