import assert from "node:assert/strict";
import { test } from "vitest";
import {
  BUFFER_ROWS,
  calculatePtyColumns,
  DEFAULT_COLUMNS,
  getBufferDimensions,
  getPtyDimensions,
  getTerminalDimensions,
} from "./terminalConfig.js";

test("getTerminalDimensions uses stdout dimensions when available", () => {
  const process = {
    stdout: {
      columns: 120,
      rows: 30,
    },
  };

  const result = getTerminalDimensions(process);

  assert.deepEqual(result, { columns: 120, rows: 30 });
});

test("getTerminalDimensions falls back to defaults when stdout is missing", () => {
  const process = {};

  const result = getTerminalDimensions(process);

  assert.deepEqual(result, {
    columns: DEFAULT_COLUMNS,
    rows: 24,
  });
});

test("getTerminalDimensions falls back when stdout has missing properties", () => {
  const process = {
    stdout: {},
  };

  const result = getTerminalDimensions(process);

  assert.deepEqual(result, {
    columns: DEFAULT_COLUMNS,
    rows: 24,
  });
});

test("getTerminalDimensions uses partial stdout values", () => {
  const processWithOnlyColumns = {
    stdout: {
      columns: 100,
    },
  };

  const result1 = getTerminalDimensions(processWithOnlyColumns);
  assert.deepEqual(result1, {
    columns: 100,
    rows: 24,
  });

  const processWithOnlyRows = {
    stdout: {
      rows: 50,
    },
  };

  const result2 = getTerminalDimensions(processWithOnlyRows);
  assert.deepEqual(result2, {
    columns: DEFAULT_COLUMNS,
    rows: 50,
  });
});

test("calculatePtyColumns subtracts overhead and respects minimum", () => {
  assert.equal(calculatePtyColumns(100), 98);
  assert.equal(calculatePtyColumns(DEFAULT_COLUMNS), DEFAULT_COLUMNS);
  assert.equal(calculatePtyColumns(50), DEFAULT_COLUMNS);
});

test("getPtyDimensions applies column calculation", () => {
  const terminalDimensions = { columns: 120, rows: 30 };

  const result = getPtyDimensions(terminalDimensions);

  assert.equal(result.columns, 118);
  assert.equal(result.rows, 30);
});

test("getBufferDimensions uses fixed row count", () => {
  const terminalDimensions = { columns: 120, rows: 30 };

  const result = getBufferDimensions(terminalDimensions);

  assert.equal(result.columns, 118);
  assert.equal(result.rows, BUFFER_ROWS);
});

test("calculatePtyColumns respects minimum column width", () => {
  // Test with very small terminal
  assert.equal(calculatePtyColumns(10), DEFAULT_COLUMNS);
  assert.equal(calculatePtyColumns(70), DEFAULT_COLUMNS);
  assert.equal(calculatePtyColumns(DEFAULT_COLUMNS + 1), DEFAULT_COLUMNS);
});
