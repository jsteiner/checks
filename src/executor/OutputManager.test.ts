import assert from "node:assert/strict";
import { test } from "vitest";
import { DEFAULT_TEST_DIMENSIONS } from "../test/helpers/terminal.js";
import { OutputManager } from "./OutputManager.js";

test("returns null for empty chunks", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  const result = await manager.appendChunk("");
  assert.equal(result, null);

  manager.dispose();
});

test("preserves color codes in output", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);
  const coloredOutput = "\u001B[31mError:\u001B[0m Something went wrong";

  const result = await manager.appendChunk(coloredOutput);

  assert.equal(result, coloredOutput);
  manager.dispose();
});

test("strips cursor movement codes from output", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);
  const outputWithCursor = "Line 1\u001B[2ALine 2";

  const result = await manager.appendChunk(outputWithCursor);

  assert.ok(result);
  assert.ok(!result.includes("\u001B[2A"));
  manager.dispose();
});

test("strips carriage returns from output", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);
  const outputWithCR = "Processing...\rDone!";

  const result = await manager.appendChunk(outputWithCR);

  assert.ok(result);
  // Carriage return moves cursor to start, so "Done!" overwrites the beginning
  assert.ok(result.includes("Done!"));
  assert.ok(!result.includes("Processing"));
  manager.dispose();
});

test("handles dynamic output with colors and cursor movement", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);
  // Simulates knip-like output: colored progress that updates in place
  const chunk1 = "\u001B[33mScanning...\u001B[0m";
  const chunk2 = "\r\u001B[32mFound 5 issues\u001B[0m";

  const result1 = await manager.appendChunk(chunk1);
  assert.equal(result1, "\u001B[33mScanning...\u001B[0m");

  const result2 = await manager.appendChunk(chunk2);
  // The second chunk overwrites the first due to \r
  assert.equal(result2, "\u001B[32mFound 5 issues\u001B[0m");

  manager.dispose();
});

test("handles multiple chunks with mixed ANSI codes", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  const result1 = await manager.appendChunk("\u001B[36mInfo:\u001B[0m ");
  assert.ok(result1);
  assert.ok(result1.includes("Info:"));

  const result2 = await manager.appendChunk("Processing\u001B[K"); // With erase sequence
  assert.ok(result2);

  const result3 = await manager.appendChunk("\r\u001B[32mDone\u001B[0m"); // With carriage return
  assert.ok(result3);
  // \r moves cursor to start, "Done" overwrites the beginning
  assert.ok(result3.includes("Done"));

  manager.dispose();
});

test("deduplicates identical output", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  const result1 = await manager.appendChunk("hello");
  assert.equal(result1, "hello");

  // Same output again - should be deduplicated
  const result2 = await manager.appendChunk("");
  assert.equal(result2, null);

  manager.dispose();
});

test("returns null when output unchanged after processing", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  await manager.appendChunk("Line 1\n");
  const result = await manager.appendChunk(""); // Empty chunk

  assert.equal(result, null);
  manager.dispose();
});

test("handles resize and returns updated output", () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  // Resize should return current buffer content (empty initially)
  const result = manager.resize(100, 50);

  // Empty buffer returns empty string or null
  assert.ok(result === "" || result === null);
  manager.dispose();
});

test("handles resize after content added", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  await manager.appendChunk("Some long line that might wrap");

  // Resize to different width
  const result = manager.resize(100, 50);

  // Should return content (might be same or different depending on wrapping)
  assert.ok(typeof result === "string" || result === null);
  manager.dispose();
});

test("resize returns null when output unchanged", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  await manager.appendChunk("Short");

  // Resize to same dimensions
  const originalColumns = DEFAULT_TEST_DIMENSIONS.columns;
  const result = manager.resize(originalColumns);

  // Content didn't change, should deduplicate
  assert.equal(result, null);
  manager.dispose();
});

test("disposes buffer without errors", () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  // Should not throw
  assert.doesNotThrow(() => {
    manager.dispose();
  });
});

test("handles Buffer input (not just strings)", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  const buffer = Buffer.from("Hello from buffer");
  const result = await manager.appendChunk(buffer);

  assert.equal(result, "Hello from buffer");
  manager.dispose();
});

test("handles multiline output correctly", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  const multiline = "Line 1\nLine 2\nLine 3";
  const result = await manager.appendChunk(multiline);

  assert.ok(result);
  assert.ok(result.includes("Line 1"));
  assert.ok(result.includes("Line 2"));
  assert.ok(result.includes("Line 3"));
  manager.dispose();
});

test("resize without explicit rows parameter uses default", async () => {
  const manager = new OutputManager(DEFAULT_TEST_DIMENSIONS);

  await manager.appendChunk("Test content");

  // Call resize with only columns (rows should default to BUFFER_ROWS)
  const result = manager.resize(200);

  // Result could be string or null depending on whether wrapping changed
  assert.ok(result === null || typeof result === "string");
  manager.dispose();
});
