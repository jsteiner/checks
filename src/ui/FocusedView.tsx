import { Box } from "ink";
import type { CheckState } from "../types.js";
import { Check } from "./Check.js";

interface FocusedViewProps {
  check: CheckState;
}

export function FocusedView({ check }: FocusedViewProps) {
  return (
    <Box flexDirection="column">
      <Check check={check} showOutput />
    </Box>
  );
}
