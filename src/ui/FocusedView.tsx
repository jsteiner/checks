import { Box } from "ink";
import { useMemo } from "react";
import type { CheckState } from "../types.js";
import { Check } from "./Check.js";
import { Legend } from "./Legend.js";
import type { HotkeyConfig, VisibleStreams } from "./types.js";

interface FocusedViewProps {
  check: CheckState;
  visibleStreams: VisibleStreams;
  onVisibleStreamsChange: (streams: VisibleStreams) => void;
  onFocusChange: (nextIndex: number | null) => void;
  globalHotkeys: HotkeyConfig[];
  interactive: boolean;
}

export function FocusedView({
  check,
  visibleStreams,
  onVisibleStreamsChange,
  onFocusChange,
  globalHotkeys,
  interactive,
}: FocusedViewProps) {
  const hotkeys = useMemo(
    () => [
      ...createFocusHotkeys({
        visibleStreams,
        onVisibleStreamsChange,
        onUnfocus: () => onFocusChange(null),
      }),
      ...globalHotkeys,
    ],
    [globalHotkeys, onFocusChange, onVisibleStreamsChange, visibleStreams],
  );

  return (
    <Box flexDirection="column">
      <Check check={check} visibleStreams={visibleStreams} />
      <Box marginTop={1}>
        <Legend hotkeys={hotkeys} interactive={interactive} />
      </Box>
    </Box>
  );
}

function createFocusHotkeys({
  visibleStreams,
  onVisibleStreamsChange,
  onUnfocus,
}: {
  visibleStreams: VisibleStreams;
  onVisibleStreamsChange: (streams: VisibleStreams) => void;
  onUnfocus: () => void;
}): HotkeyConfig[] {
  return [
    {
      keys: "o",
      description: "stdout",
      handler: () => onVisibleStreamsChange("stdout"),
      color: visibleStreams === "stdout" ? "cyan" : "gray",
    },
    {
      keys: "e",
      description: "stderr",
      handler: () => onVisibleStreamsChange("stderr"),
      color: visibleStreams === "stderr" ? "cyan" : "gray",
    },
    {
      keys: "a",
      description: "all",
      handler: () => onVisibleStreamsChange("all"),
      color: visibleStreams === "all" ? "cyan" : "gray",
    },
    { keys: "x", description: "unfocus", handler: onUnfocus },
  ];
}
