import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { sanitizeOutput } from "./sanitization.js";

describe("sanitizeOutput", () => {
  test("preserves color codes (SGR)", () => {
    const input = "\u001B[31mRed\u001B[0m";
    const expected = "\u001B[31mRed\u001B[0m";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("preserves text style codes (bold, italic, etc.)", () => {
    const input = "\u001B[1;31mBold Red\u001B[0m";
    const expected = "\u001B[1;31mBold Red\u001B[0m";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("strips cursor movement codes (up)", () => {
    const input = "Hello\u001B[2AWorld";
    const expected = "HelloWorld";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("strips cursor movement codes (down)", () => {
    const input = "Hello\u001B[3BWorld";
    const expected = "HelloWorld";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("strips cursor positioning codes", () => {
    const input = "\u001B[1;1HTop";
    const expected = "Top";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("strips erase sequences (erase line)", () => {
    const input = "Test\u001B[K";
    const expected = "Test";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("strips erase sequences (erase display)", () => {
    const input = "Clear\u001B[2J";
    const expected = "Clear";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("strips carriage returns", () => {
    const input = "A\rB";
    const expected = "AB";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("handles mixed content (colors + cursor movement)", () => {
    const input = "A\u001B[31mRed\u001B[0m\u001B[2AB";
    const expected = "A\u001B[31mRed\u001B[0mB";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("handles realistic dynamic output (knip-like)", () => {
    // Simulates: "Processing...\rProcessed 10 files"
    const input =
      "\u001B[33mProcessing...\u001B[0m\r\u001B[32mProcessed 10 files\u001B[0m";
    const expected =
      "\u001B[33mProcessing...\u001B[0m\u001B[32mProcessed 10 files\u001B[0m";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("preserves empty string", () => {
    const input = "";
    const expected = "";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("preserves plain text unchanged", () => {
    const input = "Hello, World!";
    const expected = "Hello, World!";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("preserves multiple color codes in sequence", () => {
    const input =
      "\u001B[31m\u001B[1mBold Red\u001B[0m\u001B[32mGreen\u001B[0m";
    const expected =
      "\u001B[31m\u001B[1mBold Red\u001B[0m\u001B[32mGreen\u001B[0m";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("strips mode changes", () => {
    const input = "Before\u001B[?25lAfter"; // Hide cursor
    const expected = "BeforeAfter";
    assert.equal(sanitizeOutput(input), expected);
  });

  test("handles complex real-world scenario", () => {
    // Simulates progress bar that updates in place with colors
    const input =
      "\u001B[2K\r\u001B[36mProgress:\u001B[0m \u001B[32m50%\u001B[0m";
    const expected = "\u001B[36mProgress:\u001B[0m \u001B[32m50%\u001B[0m";
    assert.equal(sanitizeOutput(input), expected);
  });
});
