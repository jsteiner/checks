/**
 * Sanitizes terminal output by removing cursor control codes while preserving
 * SGR (Select Graphic Rendition) codes for colors and text styles.
 *
 * This is necessary because child processes spawned via node-pty emit raw terminal
 * output including ANSI escape codes. Commands that use dynamic progress indicators
 * (like spinners or updating lines) use cursor movement codes that confuse ink's
 * layout engine when re-rendered in a static context.
 *
 * @param text - Raw terminal output possibly containing ANSI escape codes
 * @returns Sanitized text with cursor control codes removed but colors/styles preserved
 */
export function sanitizeOutput(text: string): string {
  // Strip cursor movement, positioning, and erase sequences
  // Preserves SGR (color/style) codes which end in 'm'
  return (
    text
      // biome-ignore lint/suspicious/noControlCharactersInRegex: needed to strip ANSI cursor movement codes
      .replace(/\u001B\[[0-9]*[ABCD]/g, "") // Cursor movement (up, down, forward, back)
      // biome-ignore lint/suspicious/noControlCharactersInRegex: needed to strip ANSI cursor positioning codes
      .replace(/\u001B\[[0-9;]*[Hf]/g, "") // Cursor positioning
      // biome-ignore lint/suspicious/noControlCharactersInRegex: needed to strip ANSI erase sequences
      .replace(/\u001B\[[0-9]*[JK]/g, "") // Erase sequences (display/line)
      // biome-ignore lint/suspicious/noControlCharactersInRegex: needed to strip ANSI mode changes
      .replace(/\u001B\[[?0-9;]*[hlnsu]/g, "") // Mode changes
      .replace(/\r/g, "")
  ); // Carriage returns
  // Note: SGR codes (\u001B\[[0-9;]*m) are NOT removed - they're preserved for colors/styles!
}
