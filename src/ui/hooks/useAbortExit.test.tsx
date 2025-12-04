import { render } from "ink-testing-library";
import { test } from "vitest";
import { useAbortExit } from "./useAbortExit.js";

function TestComponent({
  abortSignal,
  exit,
  interactive,
  isComplete,
}: {
  abortSignal: AbortSignal;
  exit: () => void;
  interactive: boolean;
  isComplete: boolean;
}) {
  useAbortExit({ abortSignal, exit, interactive, isComplete });
  return null;
}

function setupAbortExitTest({
  interactive,
  isComplete,
}: {
  interactive: boolean;
  isComplete: boolean;
}) {
  const controller = new AbortController();
  let exitCalled = false;
  const exit = () => {
    exitCalled = true;
  };

  render(
    <TestComponent
      abortSignal={controller.signal}
      exit={exit}
      interactive={interactive}
      isComplete={isComplete}
    />,
  );

  return { controller, getExitCalled: () => exitCalled };
}

test("exits when non-interactive and complete", () => {
  const { getExitCalled } = setupAbortExitTest({
    interactive: false,
    isComplete: true,
  });

  if (!getExitCalled()) {
    throw new Error("Expected exit to be called");
  }
});

test("exits immediately when abortSignal is already aborted", () => {
  const controller = new AbortController();
  controller.abort();

  let exitCalled = false;
  const exit = () => {
    exitCalled = true;
  };

  render(
    <TestComponent
      abortSignal={controller.signal}
      exit={exit}
      interactive={true}
      isComplete={false}
    />,
  );

  if (!exitCalled) {
    throw new Error("Expected exit to be called when signal already aborted");
  }
});

test("exits when abort signal fires", () => {
  const { controller, getExitCalled } = setupAbortExitTest({
    interactive: true,
    isComplete: false,
  });

  controller.abort();

  if (!getExitCalled()) {
    throw new Error("Expected exit to be called after abort");
  }
});

test("does not exit when interactive and not complete", () => {
  const { getExitCalled } = setupAbortExitTest({
    interactive: true,
    isComplete: false,
  });

  if (getExitCalled()) {
    throw new Error("Expected exit to not be called");
  }
});
