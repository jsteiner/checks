import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { CheckState } from "../types.js";

interface LayoutValue {
  nameWidth: number;
  indexWidth: number;
  commandWidth: number;
}

const LayoutContext = createContext<LayoutValue | null>(null);

export function LayoutProvider({
  checks,
  children,
}: {
  checks: CheckState[];
  children: ReactNode;
}) {
  const value = useMemo(() => calculateLayout(checks), [checks]);

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout(): LayoutValue {
  const value = useContext(LayoutContext);
  if (value === null) {
    throw new Error("useLayout must be used within LayoutProvider");
  }
  return value;
}

function calculateLayout(checks: CheckState[]): LayoutValue {
  const nameWidth = checks.reduce(
    (max, check) => Math.max(max, check.name.length),
    0,
  );
  const commandWidth = checks.reduce(
    (max, check) => Math.max(max, check.command.length),
    0,
  );
  const indexWidth = Math.max(1, String(checks.length).length);

  return { nameWidth, indexWidth, commandWidth };
}
