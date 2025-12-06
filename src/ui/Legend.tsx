import { Text } from "ink";
import type { HotkeyConfig } from "./types.js";

interface LegendProps {
  interactive: boolean;
  hotkeys: HotkeyConfig[];
}

export function Legend({ interactive, hotkeys }: LegendProps) {
  if (!interactive) return null;

  return (
    <Text>
      {hotkeys.map((item, index) => {
        const isLast = index === hotkeys.length - 1;
        return (
          <Text key={`${item.keys}-${item.description}`} color="grey">
            <LegendItem {...item} />
            {isLast ? null : <Text> · </Text>}
          </Text>
        );
      })}
    </Text>
  );
}

function LegendItem({ keys, description }: HotkeyConfig) {
  return <Text>{`${keys} to ${description}`}</Text>;
}
