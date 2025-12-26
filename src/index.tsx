#!/usr/bin/env node

import { EventEmitter } from "node:events";
import { realpathSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { render } from "ink";
import React from "react";
import stripAnsi from "strip-ansi";
import { Executor } from "./executor/index.js";
import { getTerminalDimensions } from "./executor/terminalConfig.js";
import { FileConfigError } from "./input/fileConfig.js";
import { buildInput, type Input } from "./input/index.js";
import { Suite } from "./state/Suite.js";
import type { TerminalDimensions } from "./types.js";
import { App } from "./ui/App.js";

class BufferedOutputStream extends EventEmitter {
  columns: number;
  private lastFrame: string | undefined;

  constructor(columns: number) {
    super();
    this.columns = columns;
  }

  write = (frame: string) => {
    this.lastFrame = frame;
  };

  getLastFrame = () => this.lastFrame;
}

export const EXIT_CODES = {
  success: 0,
  orchestratorError: 1,
  checksFailed: 2,
  aborted: 3,
} as const;

// Ensure React runtime is available when executing via tsx in tests.
React;

type RunnerDeps = {
  renderApp?: typeof render;
  createExecutor?: (
    input: Input,
    store: Suite,
    abortSignal: AbortSignal,
    terminalDimensions: TerminalDimensions,
  ) => { run: () => Promise<void> };
  logError?: (message: string) => void;
};

const defaultDeps: Required<RunnerDeps> = {
  renderApp: render,
  createExecutor: (input, store, abortSignal, terminalDimensions) =>
    new Executor(input, store, abortSignal, terminalDimensions),
  logError: (message) => {
    console.error(message);
  },
};

export async function runChecks(
  argv: string[] = process.argv,
  deps: RunnerDeps = {},
): Promise<number> {
  const { renderApp, createExecutor, logError } = { ...defaultDeps, ...deps };

  const abortController = new AbortController();
  installInterruptHandler(abortController);

  let input: Input;
  try {
    input = await buildInput(argv);
  } catch (error) {
    const message =
      error instanceof FileConfigError || error instanceof Error
        ? error.message
        : "Unexpected error while loading configuration";
    logError(message);
    return EXIT_CODES.orchestratorError;
  }

  const terminalDimensions: TerminalDimensions = getTerminalDimensions(process);

  const store = new Suite({ projects: input.projects });
  const executor = createExecutor(
    input,
    store,
    abortController.signal,
    terminalDimensions,
  );

  const noAnsi = input.options.noAnsi || !process.stdout.isTTY;

  const appElement = (
    <App
      store={store}
      interactive={noAnsi ? false : input.options.interactive}
      abortSignal={abortController.signal}
      onAbort={() => {
        if (!abortController.signal.aborted) {
          abortController.abort();
        }
      }}
    />
  );

  if (noAnsi) {
    const bufferedOutput = new BufferedOutputStream(terminalDimensions.columns);
    const ink = renderApp(appElement, {
      stdout: bufferedOutput as unknown as NodeJS.WriteStream,
      patchConsole: false,
    });

    try {
      await Promise.all([executor.run(), store.waitForCompletion()]);

      await new Promise((resolve) => setImmediate(resolve));

      const lastFrame = bufferedOutput.getLastFrame() ?? "";
      const plainOutput = stripAnsi(lastFrame);
      process.stdout.write(plainOutput);

      ink.unmount();
    } catch (error) {
      ink.unmount();
      logError(
        error instanceof Error ? error.message : "Unexpected runtime error",
      );
      return EXIT_CODES.orchestratorError;
    }
  } else {
    const ink = renderApp(appElement);

    try {
      const exitPromise = ink.waitUntilExit();
      await Promise.all([executor.run(), store.waitForCompletion()]);
      await exitPromise;
    } catch (error) {
      logError(
        error instanceof Error ? error.message : "Unexpected runtime error",
      );
      return EXIT_CODES.orchestratorError;
    }
  }

  const { summary } = store.toState();
  if (abortController.signal.aborted || summary.aborted > 0) {
    return EXIT_CODES.aborted;
  }

  if (summary.failed > 0) {
    return EXIT_CODES.checksFailed;
  }

  return EXIT_CODES.success;
}

async function main(argv: string[] = process.argv) {
  const exitCode = await runChecks(argv);
  exitWithNewline(exitCode);
}

function installInterruptHandler(controller: AbortController) {
  process.once("SIGINT", () => {
    controller.abort();
  });
}

function exitWithNewline(exitCode: number) {
  // Add a separator so downstream pnpm/npm lifecycle output doesn't run onto the same line.
  process.stdout.write("\n");
  process.exit(exitCode);
}

const isExecutedDirectly = (() => {
  const argvPath = process.argv[1];
  if (!argvPath) return true;
  const argvReal = safeRealpath(argvPath);
  const entryReal = safeRealpath(fileURLToPath(import.meta.url));
  return argvReal !== null && entryReal !== null && argvReal === entryReal;
})();

if (isExecutedDirectly) {
  void main();
}

function safeRealpath(p: string): string | null {
  try {
    return realpathSync(path.resolve(p));
  } catch {
    return null;
  }
}
