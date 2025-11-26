#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";
import { render } from "ink";
import React from "react";
import { Executor } from "./executor/index.js";
import { FILE_CONFIG_PATH, FileConfigError } from "./input/fileConfig.js";
import { buildInput, type Input } from "./input/index.js";
import { Suite } from "./state/Suite.js";
import { App } from "./ui/App.js";

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
  ) => { run: () => Promise<void> };
  logError?: (message: string) => void;
};

const defaultDeps: Required<RunnerDeps> = {
  renderApp: render,
  createExecutor: (input, store, abortSignal) =>
    new Executor(input, store, abortSignal),
  logError: (message) => {
    console.error(message);
  },
};

export async function runChecks(
  configPath: string = FILE_CONFIG_PATH,
  argv: string[] = process.argv,
  deps: RunnerDeps = {},
): Promise<number> {
  const { renderApp, createExecutor, logError } = { ...defaultDeps, ...deps };

  const startTime = Date.now();
  const abortController = new AbortController();
  installInterruptHandler(abortController);

  let input: Input;
  try {
    input = await buildInput(configPath, argv);
  } catch (error) {
    const message =
      error instanceof FileConfigError || error instanceof Error
        ? error.message
        : "Unexpected error while loading configuration";
    logError(message);
    return EXIT_CODES.orchestratorError;
  }

  const store = new Suite({ projects: input.projects }, startTime);
  const executor = createExecutor(input, store, abortController.signal);
  const ink = renderApp(
    <App
      store={store}
      interactive={input.options.interactive}
      abortSignal={abortController.signal}
      onAbort={() => {
        if (!abortController.signal.aborted) {
          abortController.abort();
        }
      }}
    />,
  );

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

  const { summary } = store.toState();
  if (abortController.signal.aborted || summary.aborted > 0) {
    return EXIT_CODES.aborted;
  }

  if (summary.failed > 0) {
    return EXIT_CODES.checksFailed;
  }

  return EXIT_CODES.success;
}

async function main(
  configPath: string = FILE_CONFIG_PATH,
  argv: string[] = process.argv,
) {
  const exitCode = await runChecks(configPath, argv);
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

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void main();
}
