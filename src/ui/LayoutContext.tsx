import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { CheckState, ProjectState } from "../types.js";

interface LayoutValue {
  nameWidth: number;
  indexWidth: number;
  commandWidth: number;
  projectWidth: number;
  projectNameWidth: number;
}

const LayoutContext = createContext<LayoutValue | null>(null);

export function LayoutProvider({
  checks,
  projects,
  children,
}: {
  checks: CheckState[];
  projects: ProjectState[];
  children: ReactNode;
}) {
  const value = useMemo(
    () => calculateLayout(checks, projects),
    [checks, projects],
  );

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

function calculateLayout(
  checks: CheckState[],
  projects: ProjectState[],
): LayoutValue {
  const nameWidth = checks.reduce(
    (max, check) => Math.max(max, check.name.length),
    0,
  );
  const maxCommandLength = checks.reduce(
    (max, check) => Math.max(max, check.command.length),
    0,
  );
  const commandWidth = Math.min(maxCommandLength, 20);
  const indexWidth = Math.max(1, `${checks.length}.`.length);
  const projectWidth = projects.reduce(
    (max, project) => Math.max(max, project.project.length),
    0,
  );
  let projectNameWidth = 0;
  for (const project of projects) {
    for (const check of project.checks) {
      const combinedLength = project.project.length + 1 + check.name.length;
      projectNameWidth = Math.max(projectNameWidth, combinedLength);
    }
  }

  return {
    nameWidth,
    indexWidth,
    commandWidth,
    projectWidth,
    projectNameWidth,
  };
}
