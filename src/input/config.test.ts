import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ConfigError, loadConfig } from "./config.js";

async function createTempPath(fileName: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "checks-config-"));
  return path.join(dir, fileName);
}

test("throws when config file is missing", async () => {
  const missingPath = path.join(os.tmpdir(), "checks-missing-config.json");
  await assert.rejects(loadConfig(missingPath), ConfigError);
});

test("wraps unknown read errors", async () => {
  const filePath = await createTempPath("unreadable.json");
  await fs.writeFile(filePath, "{}", "utf8");
  const originalReadFile = fs.readFile;

  (fs as unknown as Record<string, unknown>)["readFile"] = async () => {
    const error = new Error("cannot read") as NodeJS.ErrnoException;
    error.code = "EACCES";
    throw error;
  };

  try {
    await assert.rejects(
      async () => loadConfig(filePath),
      (error) => {
        assert.ok(error instanceof ConfigError);
        assert.match(error.message, /Failed to read config/);
        return true;
      },
    );
  } finally {
    (fs as unknown as Record<string, unknown>)["readFile"] = originalReadFile;
  }
});

test("throws when config file contains invalid JSON", async () => {
  const filePath = await createTempPath("invalid.json");
  await fs.writeFile(filePath, "{not-json", "utf8");

  await assert.rejects(
    async () => loadConfig(filePath),
    (error) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /Invalid JSON/);
      return true;
    },
  );
});

test("throws when config structure is invalid", async () => {
  const filePath = await createTempPath("structure.json");
  await fs.writeFile(filePath, JSON.stringify({ checks: {} }), "utf8");

  await assert.rejects(
    async () => loadConfig(filePath),
    (error) => {
      assert.ok(error instanceof ConfigError);
      assert.match(error.message, /Invalid config structure/);
      return true;
    },
  );
});

test("parses a valid config", async () => {
  const filePath = await createTempPath("valid.json");
  await fs.writeFile(
    filePath,
    JSON.stringify({
      checks: [
        { name: "lint", command: "pnpm lint" },
        { name: "test", command: "pnpm test" },
      ],
    }),
    "utf8",
  );

  const config = await loadConfig(filePath);
  assert.equal(config.checks.length, 2);
  assert.deepEqual(config.checks[0], { name: "lint", command: "pnpm lint" });
});
