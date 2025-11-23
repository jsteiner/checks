import { Text, useInput } from "ink";
import type { HotkeyConfig } from "./types.js";

interface LegendProps {
  hotkeys: HotkeyConfig[];
  interactive: boolean;
}

export function Legend({ hotkeys, interactive }: LegendProps) {
  useInput(
    (input) => {
      const match = hotkeys.find((hotkey) =>
        hotkey.match ? hotkey.match(input) : input === hotkey.keys,
      );
      match?.handler(input);
    },
    { isActive: interactive },
  );

  return (
    <Text>
      {hotkeys.map((item, index) => {
        const isLast = index === hotkeys.length - 1;
        return (
          <Text key={`${item.keys}-${item.description}`}>
            <LegendItem {...item} />
            {isLast ? null : <Text> | </Text>}
          </Text>
        );
      })}
    </Text>
  );
}

function LegendItem({ keys, description, color }: HotkeyConfig) {
  return <Text color={color ?? "gray"}>{`${keys}: ${description}`}</Text>;
}
