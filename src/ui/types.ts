export interface HotkeyConfig {
  keys: string;
  description: string;
  handler: (input: string) => void;
  match?: (input: string) => boolean;
}
