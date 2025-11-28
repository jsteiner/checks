import type { TerminalDimensions } from "../types.js";
import { TerminalBuffer } from "./TerminalBuffer.js";
import { BUFFER_ROWS, getBufferDimensions } from "./terminalConfig.js";

/**
 * Manages terminal buffer lifecycle and output processing for a single check execution.
 *
 * Responsibilities:
 * - Owns and manages a TerminalBuffer instance
 * - Processes stdout chunks through the buffer (ANSI code handling)
 * - Deduplicates output to avoid unnecessary updates
 * - Handles terminal resize events
 */
export class OutputManager {
  private buffer: TerminalBuffer;
  private lastRendered = "";

  constructor(terminalDimensions: TerminalDimensions) {
    const bufferDims = getBufferDimensions(terminalDimensions);
    this.buffer = new TerminalBuffer({
      columns: bufferDims.columns,
      rows: bufferDims.rows,
    });
  }

  async appendChunk(chunk: Buffer | string): Promise<string | null> {
    const text = chunk.toString();
    if (!text) return null;

    await this.buffer.write(text);
    return this.getRenderedIfChanged();
  }

  resize(columns: number, rows: number = BUFFER_ROWS): string | null {
    this.buffer.resize(columns, rows);
    return this.getRenderedIfChanged();
  }

  private getRenderedIfChanged(): string | null {
    const rendered = this.buffer.getRenderedOutput();

    if (this.lastRendered === rendered) return null;
    this.lastRendered = rendered;
    return rendered;
  }

  dispose(): void {
    this.buffer.dispose();
  }
}
