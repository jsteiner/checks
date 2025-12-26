import assert from "node:assert/strict";
import path from "node:path";
import { test, vi } from "vitest";
import { EXIT_CODES, runChecks } from "./index.js";
import type { Suite } from "./state/Suite.js";
import { createRenderWithAbort } from "./test/helpers/app.jsx";
import { createConfigFile } from "./test/helpers/configFile.js";
import { createConfigData } from "./test/helpers/factories.js";

type InkRender = typeof import("ink").render;
type ExecutorFactory = (
  input: unknown,
  store: Suite,
) => { run: () => Promise<void> };

const renderStub = () => ({
  waitUntilExit: async () => {},
});

async function runTestConfig(
  config: Record<string, unknown>,
  executor: ExecutorFactory,
  logError?: (message: string) => void,
) {
  const configPath = await createConfigFile(config);
  const configDir = path.dirname(configPath);

  return runChecks(["node", "checks", configDir], {
    renderApp: renderStub as unknown as InkRender,
    createExecutor: executor,
    ...(logError && { logError }),
  });
}

async function runTestConfigWithAbort(
  config: Record<string, unknown>,
  executor: ExecutorFactory,
) {
  const configPath = await createConfigFile(config);
  const configDir = path.dirname(configPath);
  const renderWithAbort = createRenderWithAbort();

  return runChecks(["node", "checks", configDir], {
    renderApp: renderWithAbort as InkRender,
    createExecutor: executor,
  });
}

async function runTestConfigWithArgs(
  config: Record<string, unknown>,
  args: string[],
  logError: (message: string) => void,
) {
  const configPath = await createConfigFile(config);
  const configDir = path.dirname(configPath);

  return runChecks(["node", "checks", configDir, ...args], {
    renderApp: renderStub as unknown as InkRender,
    createExecutor: () => ({ run: async () => {} }),
    logError,
  });
}

test("surfaces invalid glob errors to the user", async () => {
  const errors: string[] = [];
  const exitCode = await runTestConfigWithArgs(
    createConfigData({
      checks: [{ name: "lint", command: "echo lint" }],
    }),
    ["--only", "li*:deep"],
    (message) => errors.push(message),
  );

  assert.equal(exitCode, EXIT_CODES.orchestratorError);
  assert.match(
    errors[0] ?? "",
    /Invalid glob pattern "li\*:deep"\. Globs are not allowed mid-string\./,
  );
});

test("notifies when no checks are defined", async () => {
  const errors: string[] = [];
  const exitCode = await runTestConfig(
    createConfigData({ checks: [] }),
    () => ({ run: async () => {} }),
    (message) => errors.push(message),
  );

  assert.equal(exitCode, EXIT_CODES.orchestratorError);
  assert.match(errors[0] ?? "", /No checks defined/);
});

test("notifies when filters exclude all checks", async () => {
  const errors: string[] = [];
  const exitCode = await runTestConfigWithArgs(
    createConfigData({
      checks: [{ name: "lint", command: "echo lint" }],
    }),
    ["--only", "missing"],
    (message) => errors.push(message),
  );

  assert.equal(exitCode, EXIT_CODES.orchestratorError);
  assert.match(errors[0] ?? "", /No checks matched/);
});

test("runs checks successfully and exits with success code", async () => {
  const exitCode = await runTestConfig(createConfigData(), (_input, store) => ({
    run: async () => {
      store.getCheck(0, 0).markPassed(0);
    },
  }));

  assert.equal(exitCode, EXIT_CODES.success);
});

test("exits with checks failed code when a check fails", async () => {
  const exitCode = await runTestConfig(createConfigData(), (_input, store) => ({
    run: async () => {
      store.getCheck(0, 0).markFailed(1, "boom");
    },
  }));

  assert.equal(exitCode, EXIT_CODES.checksFailed);
});

test("exits with aborted code when receiving SIGINT", async () => {
  const exitCode = await runTestConfigWithAbort(
    createConfigData(),
    (_input, store) => ({
      run: async () => {
        store.getCheck(0, 0).markAborted();
      },
    }),
  );

  assert.equal(exitCode, EXIT_CODES.aborted);
});

test("exits with aborted code when signal is aborted but checks are not marked aborted", async () => {
  const exitCode = await runTestConfigWithAbort(
    createConfigData(),
    (_input, store) => ({
      run: async () => {
        store.getCheck(0, 0).markPassed(0);
      },
    }),
  );

  assert.equal(exitCode, EXIT_CODES.aborted);
});

test("logs runtime errors and exits with orchestrator error", async () => {
  const errors: string[] = [];
  const exitCode = await runTestConfig(
    createConfigData(),
    () => ({
      run: async () => {
        throw new Error("runtime boom");
      },
    }),
    (message) => errors.push(message),
  );

  assert.equal(exitCode, EXIT_CODES.orchestratorError);
  assert.match(errors[0] ?? "", /runtime boom/);
});

test("returns failed exit code when any check fails even if others pass", async () => {
  const exitCode = await runTestConfig(
    createConfigData({
      checks: [
        { name: "pass", command: "echo pass" },
        { name: "fail", command: "echo fail" },
      ],
    }),
    (_input, store) => ({
      run: async () => {
        store.getCheck(0, 0).markPassed(0);
        store.getCheck(0, 1).markFailed(1, "fail");
      },
    }),
  );

  assert.equal(exitCode, EXIT_CODES.checksFailed);
});

test("handles non-Error exceptions during runtime", async () => {
  const errors: string[] = [];
  const exitCode = await runTestConfig(
    createConfigData(),
    () => ({
      run: async () => {
        throw "string error";
      },
    }),
    (message) => errors.push(message),
  );

  assert.equal(exitCode, EXIT_CODES.orchestratorError);
  assert.match(errors[0] ?? "", /Unexpected runtime error/);
});

test("handles non-Error exceptions during config loading", async () => {
  const errors: string[] = [];
  const exitCode = await runChecks(["node", "checks", "/non/existent/path"], {
    renderApp: renderStub as unknown as InkRender,
    createExecutor: () => ({ run: async () => {} }),
    logError: (message) => errors.push(message),
  });

  assert.equal(exitCode, EXIT_CODES.orchestratorError);
  assert.ok(errors.length > 0);
});

test("handles executor run exception", async () => {
  const errors: string[] = [];
  const exitCode = await runTestConfig(
    createConfigData(),
    () => ({
      run: async () => {
        throw new Error("executor failed");
      },
    }),
    (message) => errors.push(message),
  );

  assert.equal(exitCode, EXIT_CODES.orchestratorError);
  assert.match(errors[0] ?? "", /executor failed/);
});

test("--no-ansi outputs plain text without ANSI codes", async () => {
  const configPath = await createConfigFile(createConfigData());
  const configDir = path.dirname(configPath);

  const chunks: string[] = [];
  const writeSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      chunks.push(chunk.toString());
      return true;
    });

  try {
    const exitCode = await runChecks(
      ["node", "checks", configDir, "--no-ansi"],
      {
        createExecutor: (_input, store) => ({
          run: async () => {
            store.getCheck(0, 0).markPassed(0);
          },
        }),
      },
    );

    assert.equal(exitCode, EXIT_CODES.success);
    assert.ok(chunks.length > 0, "should have written output");

    const output = chunks.join("");
    // Verify no ANSI escape codes (ESC [ or \x1b[)
    assert.ok(
      !output.includes("\x1b["),
      `output should not contain ANSI codes: ${JSON.stringify(output)}`,
    );
    assert.ok(output.includes("passed"), "output should contain check status");
  } finally {
    writeSpy.mockRestore();
  }
});

test("--no-ansi exits with correct code on failure", async () => {
  const configPath = await createConfigFile(createConfigData());
  const configDir = path.dirname(configPath);

  const writeSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation(() => true);

  try {
    const exitCode = await runChecks(
      ["node", "checks", configDir, "--no-ansi"],
      {
        createExecutor: (_input, store) => ({
          run: async () => {
            store.getCheck(0, 0).markFailed(1, "test failure");
          },
        }),
      },
    );

    assert.equal(exitCode, EXIT_CODES.checksFailed);
  } finally {
    writeSpy.mockRestore();
  }
});

test("--no-ansi handles runtime errors", async () => {
  const configPath = await createConfigFile(createConfigData());
  const configDir = path.dirname(configPath);
  const errors: string[] = [];

  const writeSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation(() => true);

  try {
    const exitCode = await runChecks(
      ["node", "checks", configDir, "--no-ansi"],
      {
        createExecutor: () => ({
          run: async () => {
            throw new Error("runtime error in no-ansi mode");
          },
        }),
        logError: (message) => errors.push(message),
      },
    );

    assert.equal(exitCode, EXIT_CODES.orchestratorError);
    assert.match(errors[0] ?? "", /runtime error in no-ansi mode/);
  } finally {
    writeSpy.mockRestore();
  }
});
