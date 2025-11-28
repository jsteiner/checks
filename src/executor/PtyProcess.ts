import { EventEmitter } from "node:events";
import os from "node:os";
import nodeProcess from "node:process";
import { PassThrough } from "node:stream";
import {
  type IDisposable,
  type IPty,
  type IPtyForkOptions,
  spawn as spawnPty,
} from "node-pty";
import {
  calculatePtyColumns,
  getPtyDimensions,
  getTerminalDimensions,
} from "./terminalConfig.js";

export type SpawnedProcess = EventEmitter & {
  pid?: number | null | undefined;
  killed?: boolean;
  kill?: (signal?: NodeJS.Signals) => boolean;
  stdout?: NodeJS.ReadableStream | null | undefined;
};

export type SpawnFunction = (
  command: string,
  cwd: string,
  onResize?: (columns: number, rows: number) => void,
) => SpawnedProcess;

type StdoutLike = {
  columns?: number;
  rows?: number;
  isTTY?: boolean;
  on: (event: "resize", listener: () => void) => unknown;
  off: (event: "resize", listener: () => void) => unknown;
};

type ProcessLike = {
  platform: typeof nodeProcess.platform;
  env: NodeJS.ProcessEnv;
  cwd: () => string;
  kill: (pid: number, signal?: NodeJS.Signals) => boolean;
  stdout: StdoutLike;
};

type PtyProcessOptions = {
  process?: ProcessLike;
  spawn?: typeof spawnPty;
  onResize?: (columns: number, rows: number) => void;
};

export class PtyProcess extends EventEmitter implements SpawnedProcess {
  pid?: number;
  stdout: PassThrough = new PassThrough();
  killed = false;
  private lastKillSignal: NodeJS.Signals | null = null;

  private readonly _process: ProcessLike;
  private readonly _spawn: typeof spawnPty;
  private readonly onResizeCallback:
    | ((columns: number, rows: number) => void)
    | undefined;

  private pty: IPty | null = null;
  private disposeResize: () => void = () => {};
  private disposeData: IDisposable | null = null;
  private disposeExit: IDisposable | null = null;

  constructor(options: PtyProcessOptions = {}) {
    super();
    this._process = options.process ?? nodeProcess;
    this._spawn = options.spawn ?? spawnPty;
    this.onResizeCallback = options.onResize;
  }

  spawn(command: string, cwd: string): this {
    if (this.pty) {
      throw new Error("Process already spawned.");
    }

    const {
      file,
      args,
      options: ptyOptions,
    } = this.buildPtySpawnOptions(command, cwd);

    const pty = this._spawn(file, args, ptyOptions);
    this.pty = pty;
    this.pid = pty.pid;

    this.disposeResize = this.installResizeSync(pty);
    this.disposeData = pty.onData((data) => {
      this.stdout.write(data);
    });

    this.disposeExit = pty.onExit(({ exitCode, signal }) => {
      const resolvedSignal = this.lastKillSignal ?? resolveSignal(signal);
      this.cleanup();
      this.stdout.end();
      this.emit("close", exitCode ?? null, resolvedSignal);
    });

    return this;
  }

  kill(signal: NodeJS.Signals = "SIGTERM"): boolean {
    if (!this.pty) {
      throw new Error("Process has not been spawned yet.");
    }

    this.killed = true;
    this.lastKillSignal = signal;

    const pid = this.pty.pid;
    if (pid) {
      try {
        this._process.kill(-pid, signal);
        return true;
      } catch {
        // Fall through to try the PTY-specific kill below.
      }
    }

    this.pty.kill(signal);
    return true;
  }

  private cleanup() {
    this.disposeResize();
    this.disposeData?.dispose();
    this.disposeExit?.dispose();
    this.pty = null;
  }

  private buildPtySpawnOptions(
    command: string,
    cwd: string,
  ): {
    file: string;
    args: string[];
    options: IPtyForkOptions;
  } {
    const { columns, rows } = this.getTerminalSize();
    const { file, args } = this.resolveShell(command);
    const options: IPtyForkOptions = {
      cols: columns,
      rows,
      cwd,
      env: this._process.env,
    };

    return { file, args, options };
  }

  private resolveShell(command: string): { file: string; args: string[] } {
    const shell = this._process.env["SHELL"] ?? "/bin/sh";
    return { file: shell, args: ["-c", command] };
  }

  private getTerminalSize() {
    const terminalDims = getTerminalDimensions(this._process);
    return getPtyDimensions(terminalDims);
  }

  private installResizeSync(pty: IPty): () => void {
    const stdout = this._process.stdout;
    if (!stdout?.isTTY) return () => {};

    let resizeTimer: NodeJS.Timeout | null = null;
    const DEBOUNCE_MS = 100;

    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);

      resizeTimer = setTimeout(() => {
        const terminalDims = getTerminalDimensions(this._process);
        const ptyDims = getPtyDimensions(terminalDims);

        pty.resize(ptyDims.columns, ptyDims.rows);

        if (this.onResizeCallback) {
          const bufferColumns = calculatePtyColumns(terminalDims.columns);
          this.onResizeCallback(bufferColumns, terminalDims.rows);
        }

        resizeTimer = null;
      }, DEBOUNCE_MS);
    };

    stdout.on("resize", onResize);
    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      stdout.off("resize", onResize);
    };
  }
}

function resolveSignal(code: number | undefined): NodeJS.Signals | null {
  if (typeof code !== "number") return null;
  return SIGNALS_BY_CODE[code] ?? null;
}

const SIGNALS_BY_CODE = Object.entries(os.constants.signals).reduce(
  (lookup, [name, value]) => {
    lookup[value] = name as NodeJS.Signals;
    return lookup;
  },
  {} as Record<number, NodeJS.Signals | undefined>,
);

export function createDefaultSpawner(
  process: ProcessLike = nodeProcess,
): SpawnFunction {
  return (command: string, cwd: string, onResize?) => {
    const options: PtyProcessOptions = { process };
    if (onResize !== undefined) {
      options.onResize = onResize;
    }
    return new PtyProcess(options).spawn(command, cwd);
  };
}
