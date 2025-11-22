import type { LogEntry, Stream } from "./types.js";

export interface FormatLogOptions {
  stream?: Stream | Stream[];
  prefix?: string;
}

export function formatLog(
  log: LogEntry[],
  options: FormatLogOptions = {},
): string {
  const { stream, prefix = "" } = options;
  const streams =
    stream === undefined
      ? null
      : new Set(Array.isArray(stream) ? stream : [stream]);

  return log.flatMap((entry) => formatEntry(entry, streams, prefix)).join("\n");
}

const formatEntry = (
  entry: LogEntry,
  streams: null | Set<Stream>,
  prefix: string,
): string[] => {
  if (streams && !streams.has(entry.stream)) return [];

  const normalizedLines = entry.text.replace(/\r\n?/g, "\n").split("\n");

  return normalizedLines.map((line) => `${prefix}${line}`);
};
