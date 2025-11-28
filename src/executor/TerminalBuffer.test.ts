import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { TerminalBuffer } from "./TerminalBuffer.js";

function buildTerminalBuffer(): TerminalBuffer {
  return new TerminalBuffer({ columns: 80, rows: 24 });
}

describe("TerminalBuffer", () => {
  test("preserves color codes (SGR)", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("\u001B[31mRed\u001B[0m");
    assert.equal(buffer.getRenderedOutput(), "\u001B[31mRed\u001B[0m");
  });

  test("preserves text style codes (bold, italic, etc.)", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("\u001B[1;31mBold Red\u001B[0m");
    // xterm may reorder the codes, but should preserve bold and red
    const output = buffer.getRenderedOutput();
    assert.ok(output.includes("Bold Red"));
    assert.ok(
      output.includes("\u001B[31") ||
        output.includes("\u001B[1;31") ||
        output.includes("\u001B[31;1"),
    );
  });

  test("handles cursor movement codes (up)", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("Hello\u001B[2AWorld");
    const output = buffer.getRenderedOutput();
    assert.ok(!output.includes("\u001B[2A")); // Cursor code removed
  });

  test("handles cursor movement codes (down)", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("Hello\u001B[3BWorld");
    const output = buffer.getRenderedOutput();
    assert.ok(!output.includes("\u001B[3B")); // Cursor code removed
  });

  test("handles cursor positioning codes", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("\u001B[1;1HTop");
    const output = buffer.getRenderedOutput();
    assert.ok(output.includes("Top"));
    assert.ok(!output.includes("\u001B[1;1H")); // Cursor code removed
  });

  test("handles erase sequences (erase line)", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("Test\u001B[K");
    const output = buffer.getRenderedOutput();
    assert.ok(output.includes("Test"));
    assert.ok(!output.includes("\u001B[K")); // Erase code removed
  });

  test("handles erase sequences (erase display)", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("Clear\u001B[2J");
    const output = buffer.getRenderedOutput();
    assert.ok(!output.includes("\u001B[2J")); // Erase code removed
  });

  test("handles carriage returns", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("A\rB");
    const output = buffer.getRenderedOutput();
    // Terminal overwrites: "A" then cursor to start, then "B" -> result is "B"
    assert.equal(output, "B");
  });

  test("handles mixed content (colors + cursor movement)", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("A\u001B[31mRed\u001B[0m\u001B[2AB");
    const output = buffer.getRenderedOutput();
    assert.ok(output.includes("\u001B[31m")); // Color preserved
    assert.ok(!output.includes("\u001B[2A")); // Cursor code removed
  });

  test("handles realistic dynamic output (knip-like)", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write(
      "\u001B[33mProcessing...\u001B[0m\r\u001B[32mProcessed 10 files\u001B[0m",
    );
    // \r moves cursor to start, so "Processed 10 files" overwrites "Processing..."
    const output = buffer.getRenderedOutput();
    assert.ok(output.includes("Processed 10 files"));
    assert.ok(output.includes("\u001B[32m")); // Color preserved
  });

  test("handles empty string", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("");
    assert.equal(buffer.getRenderedOutput(), "");
  });

  test("preserves plain text unchanged", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("Hello, World!");
    assert.equal(buffer.getRenderedOutput(), "Hello, World!");
  });

  test("preserves multiple color codes in sequence", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write(
      "\u001B[31m\u001B[1mBold Red\u001B[0m\u001B[32mGreen\u001B[0m",
    );
    // xterm may combine/reorder codes, but text and colors should be preserved
    const output = buffer.getRenderedOutput();
    assert.ok(output.includes("Bold Red"));
    assert.ok(output.includes("Green"));
    assert.ok(
      output.includes("\u001B[31") ||
        output.includes("\u001B[1;31") ||
        output.includes("\u001B[31;1"),
    );
    assert.ok(output.includes("\u001B[32"));
  });

  test("handles mode changes (hide cursor)", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("Before\u001B[?25lAfter");
    const output = buffer.getRenderedOutput();
    assert.ok(output.includes("Before"));
    assert.ok(output.includes("After"));
    assert.ok(!output.includes("\u001B[?25l")); // Mode change removed
  });

  test("handles complex real-world scenario (progress bar)", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write(
      "\u001B[2K\r\u001B[36mProgress:\u001B[0m \u001B[32m50%\u001B[0m",
    );
    const output = buffer.getRenderedOutput();
    assert.ok(output.includes("Progress:"));
    assert.ok(output.includes("50%"));
    assert.ok(output.includes("\u001B[36m")); // Color preserved
    assert.ok(!output.includes("\u001B[2K")); // Erase code removed
  });

  test("handles line replacement like knip progress", async () => {
    const buffer = buildTerminalBuffer();
    await buffer.write("Processing...");
    await buffer.write("\r\u001B[K"); // Return to start, erase line
    await buffer.write("Done!");
    assert.equal(buffer.getRenderedOutput(), "Done!");
  });
});
