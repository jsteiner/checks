import { Box } from "ink";
import { useMemo } from "react";
import type { CheckState } from "../types.js";
import { Check } from "./Check.js";
import { Legend } from "./Legend.js";
import type { HotkeyConfig } from "./types.js";

interface FocusedViewProps {
  check: CheckState;
  onFocusChange: (nextIndex: number | null) => void;
  globalHotkeys: HotkeyConfig[];
  interactive: boolean;
}

export function FocusedView({
  check,
  onFocusChange,
  globalHotkeys,
  interactive,
}: FocusedViewProps) {
  const hotkeys = useMemo(
    () => [
      ...createFocusHotkeys({
        onUnfocus: () => onFocusChange(null),
      }),
      ...globalHotkeys,
    ],
    [globalHotkeys, onFocusChange],
  );

  return (
    <Box flexDirection="column">
      <Check check={check} showOutput />
      <Box marginTop={1}>
        <Legend hotkeys={hotkeys} interactive={interactive} />
      </Box>
    </Box>
  );
}

function createFocusHotkeys({
  onUnfocus,
}: {
  onUnfocus: () => void;
}): HotkeyConfig[] {
  return [{ keys: "x", description: "unfocus", handler: onUnfocus }];
}
