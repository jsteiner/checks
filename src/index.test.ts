import assert from "node:assert/strict";
import test from "node:test";
import type { ReactElement } from "react";
import { EXIT_CODES, runChecks } from "./index.js";
import { createConfigFile } from "./test/helpers/configFile.js";

type InkRender = typeof import("ink").render;

const renderStub = () => ({
  waitUntilExit: async () => {},
});

test("surfaces invalid glob errors to the user", async () => {
  const configPath = await createConfigFile({
    project: "project",
    checks: [{ name: "lint", command: "echo lint" }],
  });

  const errors: string[] = [];
  const exitCode = await runChecks(
    configPath,
    ["node", "checks", "--only", "li*:deep"],
    {
      renderApp: renderStub as unknown as InkRender,
      createExecutor: () => ({ run: async () => {} }),
      logError: (message) => {
        errors.push(message);
      },
    },
  );

  assert.equal(exitCode, EXIT_CODES.orchestratorError);
  assert.match(
    errors[0] ?? "",
    /Invalid glob pattern "li\*:deep"\. Globs are not allowed mid-string\./,
  );
});

test("runs checks successfully and exits with success code", async () => {
  const configPath = await createConfigFile({
    project: "project",
    checks: [
      {
        name: "lint",
        command: `${process.execPath} -e "console.log('ok') ; process.exit(0)"`,
      },
    ],
  });

  const exitCode = await runChecks(configPath, ["node", "checks"], {
    renderApp: renderStub as unknown as InkRender,
    createExecutor: (_input, store) => ({
      run: async () => {
        store.getCheck(0, 0).markPassed(0);
      },
    }),
  });

  assert.equal(exitCode, EXIT_CODES.success);
});

test("exits with checks failed code when a check fails", async () => {
  const configPath = await createConfigFile({
    project: "project",
    checks: [
      {
        name: "lint",
        command: `${process.execPath} -e "console.error('boom'); process.exit(1)"`,
      },
    ],
  });

  const exitCode = await runChecks(configPath, ["node", "checks"], {
    renderApp: renderStub as unknown as InkRender,
    createExecutor: (_input, store) => ({
      run: async () => {
        store.getCheck(0, 0).markFailed(1, "boom");
      },
    }),
  });

  assert.equal(exitCode, EXIT_CODES.checksFailed);
});

test("exits with aborted code when receiving SIGINT", async () => {
  const configPath = await createConfigFile({
    project: "project",
    checks: [
      {
        name: "wait",
        command: `${process.execPath} -e "setTimeout(() => {}, 1000)"`,
      },
    ],
  });

  const renderWithAbort: InkRender = (element) => {
    const props = (element as ReactElement<{ onAbort: () => void }>).props;
    props.onAbort();
    props.onAbort();
    return renderStub() as never;
  };

  const exitCode = await runChecks(configPath, ["node", "checks"], {
    renderApp: renderWithAbort,
    createExecutor: (_input, store) => ({
      run: async () => {
        store.getCheck(0, 0).markAborted();
      },
    }),
  });

  assert.equal(exitCode, EXIT_CODES.aborted);
});

test("logs runtime errors and exits with orchestrator error", async () => {
  const configPath = await createConfigFile({
    project: "project",
    checks: [
      {
        name: "lint",
        command: `${process.execPath} -e "console.log('ok') ; process.exit(0)"`,
      },
    ],
  });

  const errors: string[] = [];
  const exitCode = await runChecks(configPath, ["node", "checks"], {
    renderApp: renderStub as unknown as InkRender,
    createExecutor: () => ({
      run: async () => {
        throw new Error("runtime boom");
      },
    }),
    logError: (message) => errors.push(message),
  });

  assert.equal(exitCode, EXIT_CODES.orchestratorError);
  assert.match(errors[0] ?? "", /runtime boom/);
});

test("returns failed exit code when any check fails even if others pass", async () => {
  const configPath = await createConfigFile({
    project: "project",
    checks: [
      { name: "pass", command: "echo pass" },
      { name: "fail", command: "echo fail" },
    ],
  });

  const exitCode = await runChecks(configPath, ["node", "checks"], {
    renderApp: renderStub as unknown as InkRender,
    createExecutor: (_input, store) => ({
      run: async () => {
        store.getCheck(0, 0).markPassed(0);
        store.getCheck(0, 1).markFailed(1, "fail");
      },
    }),
  });

  assert.equal(exitCode, EXIT_CODES.checksFailed);
});
