#!/usr/bin/env node

import process from "node:process";
import { render } from "ink";
import { Executor } from "./executor/index.js";
import { FILE_CONFIG_PATH, FileConfigError } from "./input/fileConfig.js";
import { buildInput, type Input } from "./input/index.js";
import { ChecksStore } from "./state/ChecksStore.js";
import { App } from "./ui/App.js";

const EXIT_CODES = {
  success: 0,
  orchestratorError: 1,
  checksFailed: 2,
  aborted: 3,
} as const;

async function main(
  configPath: string = FILE_CONFIG_PATH,
  argv: string[] = process.argv,
) {
  const startTime = Date.now();
  const abortController = new AbortController();
  installInterruptHandler(abortController);

  let input: Input;
  try {
    input = await buildInput(configPath, argv);
  } catch (error) {
    const message =
      error instanceof FileConfigError
        ? error.message
        : "Unexpected error while loading configuration";
    console.error(message);
    process.exit(EXIT_CODES.orchestratorError);
  }

  const store = new ChecksStore(input.config.checks, startTime);
  const executor = new Executor(input, store, abortController.signal);
  const ink = render(
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
    console.error(
      error instanceof Error ? error.message : "Unexpected runtime error",
    );
    exitWithNewline(EXIT_CODES.orchestratorError);
  }

  const summary = store.summary();
  if (abortController.signal.aborted || summary.aborted > 0) {
    exitWithNewline(EXIT_CODES.aborted);
  }

  if (summary.failed > 0) {
    exitWithNewline(EXIT_CODES.checksFailed);
  }

  exitWithNewline(EXIT_CODES.success);
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

void main();
