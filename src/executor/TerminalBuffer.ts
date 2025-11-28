import { SerializeAddon } from "@xterm/addon-serialize";
import type { Terminal as ITerminal } from "@xterm/headless";
import xterm from "@xterm/headless";
import { BUFFER_ROWS } from "./terminalConfig.js";

// Strips: cursor movement, cursor positioning, erase sequences, etc.
// Keeps: SGR codes like \x1B[31m (colors), \x1B[1m (bold), etc.
const CURSOR_CODES_REGEX =
  /\x1B\[(\d+)?[ABCDEFGJKST]|\x1B\[\??\d+(;\d+)*[hl]|\r/g;

interface TerminalBufferOptions {
  columns: number;
  rows: number;
}

export class TerminalBuffer {
  private terminal: ITerminal;
  private serializeAddon: SerializeAddon;

  constructor(options: TerminalBufferOptions) {
    this.terminal = new xterm.Terminal({
      cols: options.columns,
      rows: options.rows,
      allowProposedApi: true,
    });
    this.serializeAddon = new SerializeAddon();
    this.terminal.loadAddon(this.serializeAddon);
  }

  write(data: string): Promise<void> {
    return new Promise((resolve) => {
      this.terminal.write(data, resolve);
    });
  }

  getRenderedOutput(): string {
    return this.serializeAddon
      .serialize()
      .replace(CURSOR_CODES_REGEX, "")
      .trimEnd();
  }

  resize(columns: number, rows?: number): void {
    const newRows = rows ?? BUFFER_ROWS;
    this.terminal.resize(columns, newRows);
  }

  dispose(): void {
    this.terminal.dispose();
  }
}
