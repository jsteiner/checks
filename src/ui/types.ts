export interface HotkeyConfig {
  keys: string;
  description: string;
  color?: string;
  handler: (input: string) => void;
  match?: (input: string) => boolean;
}
