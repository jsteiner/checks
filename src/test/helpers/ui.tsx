import assert from "node:assert/strict";
import { render } from "ink-testing-library";
import type { ReactElement } from "react";
import type { CheckState } from "../../types.js";
import { LayoutProvider } from "../../ui/LayoutContext.js";

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
  return value.replace(/\u001B\[[0-9;]*m/g, "");
}

export function renderWithLayout(element: ReactElement, checks: CheckState[]) {
  const projects = [
    {
      index: 0,
      project: "test",
      path: "/test",
      color: "white" as const,
      checks,
      summary: {
        total: 0,
        pending: 0,
        passed: 0,
        failed: 0,
        aborted: 0,
        durationMs: 0,
      },
      isComplete: false,
    },
  ];
  return render(
    <LayoutProvider checks={checks} projects={projects}>
      {element}
    </LayoutProvider>,
  );
}
