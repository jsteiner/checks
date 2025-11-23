import type { Stream } from "../types.js";

export type VisibleStreams = "all" | Stream | "none";

export interface HotkeyConfig {
  keys: string;
  description: string;
  color?: string;
  handler: (input: string) => void;
  match?: (input: string) => boolean;
}
