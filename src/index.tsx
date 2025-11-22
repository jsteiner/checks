#!/usr/bin/env node

import process from "node:process";
import { render } from "ink";
import { runChecks } from "./executor.js";
import { ConfigError, type LoadedConfig, loadConfig } from "./input/config.js";
import { ChecksStore } from "./state/ChecksStore.js";
import { App } from "./ui/App.js";

const EXIT_CODES = {
  success: 0,
  orchestratorError: 1,
  checksFailed: 2,
  aborted: 3,
} as const;

async function main() {
  const startTime = Date.now();
  const abortController = new AbortController();
  installInterruptHandler(abortController);

  let config: LoadedConfig;
  try {
    config = await loadConfig();
  } catch (error) {
    const message =
      error instanceof ConfigError
        ? error.message
        : "Unexpected error while loading configuration";
    console.error(message);
    process.exit(EXIT_CODES.orchestratorError);
  }

  const store = new ChecksStore(config.checks, startTime);
  const ink = render(<App store={store} />);

  try {
    await Promise.all([
      runChecks(config.checks, store, abortController.signal),
      store.waitForCompletion(),
    ]);
    await ink.waitUntilExit();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Unexpected runtime error",
    );
    process.exit(EXIT_CODES.orchestratorError);
  }

  const summary = store.summary();
  if (abortController.signal.aborted || summary.aborted > 0) {
    process.exit(EXIT_CODES.aborted);
  }

  if (summary.failed > 0) {
    process.exit(EXIT_CODES.checksFailed);
  }

  process.exit(EXIT_CODES.success);
}

function installInterruptHandler(controller: AbortController) {
  process.once("SIGINT", () => {
    controller.abort();
  });
}

void main();
