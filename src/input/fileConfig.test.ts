import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createConfigFile,
  createRawConfigFile,
} from "../test/helpers/configFile.js";
import { createConfigData } from "../test/helpers/factories.js";
import { FileConfigError, loadFileConfig } from "./fileConfig.js";

test("throws when config file is missing", async () => {
  const missingPath = path.join(os.tmpdir(), "checks-missing-config.json");
  await assert.rejects(loadFileConfig(missingPath), FileConfigError);
});

test("wraps unknown read errors", async () => {
  const filePath = await createConfigFile({});
  const originalReadFile = fs.readFile;

  (fs as unknown as Record<string, unknown>)["readFile"] = async () => {
    const error = new Error("cannot read") as NodeJS.ErrnoException;
    error.code = "EACCES";
    throw error;
  };

  try {
    await assert.rejects(
      async () => loadFileConfig(filePath),
      (error) => {
        assert.ok(error instanceof FileConfigError);
        assert.equal(error.message, `Failed to read config at ${filePath}`);
        return true;
      },
    );
  } finally {
    (fs as unknown as Record<string, unknown>)["readFile"] = originalReadFile;
  }
});

test("throws when config file contains invalid JSON", async () => {
  const filePath = await createRawConfigFile("invalid.json", "{not-json");

  await assert.rejects(
    async () => loadFileConfig(filePath),
    (error) => {
      assert.ok(error instanceof FileConfigError);
      assert.equal(error.message, `Invalid JSON in config at ${filePath}`);
      return true;
    },
  );
});

test("throws when config structure is invalid", async () => {
  const filePath = await createConfigFile({ checks: {} });

  await assert.rejects(
    async () => loadFileConfig(filePath),
    (error) => {
      assert.ok(error instanceof FileConfigError);
      assert.equal(
        error.message,
        "Invalid config structure: project is required; checks must be an array",
      );
      return true;
    },
  );
});

test("requires a project field", async () => {
  const filePath = await createConfigFile({ checks: [] });

  await assert.rejects(
    async () => loadFileConfig(filePath),
    (error) => {
      assert.ok(error instanceof FileConfigError);
      assert.equal(
        error.message,
        "Invalid config structure: project is required",
      );
      return true;
    },
  );
});

test("parses a valid config", async () => {
  const filePath = await createConfigFile(
    createConfigData({
      project: "demo",
      checks: [
        { name: "lint", command: "pnpm lint" },
        { name: "test", command: "pnpm test" },
      ],
    }),
  );

  const config = await loadFileConfig(filePath);
  assert.equal(config.project, "demo");
  assert.equal(config.checks.length, 2);
  assert.deepEqual(config.checks[0], { name: "lint", command: "pnpm lint" });
});

test("parses an optional project color", async () => {
  const filePath = await createConfigFile(
    createConfigData({ color: "magenta" }),
  );

  const config = await loadFileConfig(filePath);
  assert.equal(config.color, "magenta");
});
