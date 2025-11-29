import type { TerminalDimensions } from "../types.js";
import { TOTAL_INSET } from "../ui/layout.js";

export const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS_PTY = 24;
export const BUFFER_ROWS = 1000;

type ProcessLike = {
  stdout?: {
    columns?: number;
    rows?: number;
  };
};

export function getTerminalDimensions(
  process: ProcessLike,
): TerminalDimensions {
  return {
    columns: process.stdout?.columns ?? DEFAULT_COLUMNS,
    rows: process.stdout?.rows ?? DEFAULT_ROWS_PTY,
  };
}

export function calculatePtyColumns(terminalColumns: number): number {
  const availableColumns = terminalColumns - TOTAL_INSET;
  return Math.max(DEFAULT_COLUMNS, availableColumns);
}

export function getPtyDimensions(
  terminalDimensions: TerminalDimensions,
): TerminalDimensions {
  return {
    columns: calculatePtyColumns(terminalDimensions.columns),
    rows: terminalDimensions.rows,
  };
}

export function getBufferDimensions(terminalDimensions: TerminalDimensions): {
  columns: number;
  rows: number;
} {
  return {
    columns: calculatePtyColumns(terminalDimensions.columns),
    rows: BUFFER_ROWS,
  };
}
