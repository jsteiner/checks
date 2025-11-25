import { useCallback, useMemo, useState } from "react";
import type { CheckState, ProjectState } from "../../types.js";

interface FocusedCheck {
  check: CheckState;
  project: ProjectState;
  index: number;
}

interface UseFocusResult {
  checks: CheckState[];
  focusedIndex: number | null;
  focusedProject: ProjectState | null;
  focusedCheck: FocusedCheck | null;
  maxFocusableIndex: number;
  onFocusChange: (index: number | null) => void;
}

export function useFocus(projects: ProjectState[]): UseFocusResult {
  const projectRanges = useMemo(
    () => createProjectRanges(projects),
    [projects],
  );
  const checks = useMemo(
    () => projects.flatMap((project) => project.checks),
    [projects],
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const focusableCount = Math.min(checks.length, 9);
  const maxFocusableIndex = focusableCount - 1;

  const focusedProject = useMemo(
    () =>
      focusedIndex === null
        ? null
        : findProjectForCheckIndex(projectRanges, focusedIndex),
    [focusedIndex, projectRanges],
  );

  const focusedCheck = useMemo(() => {
    if (
      focusedIndex === null ||
      focusedProject === null ||
      checks[focusedIndex] === undefined
    ) {
      return null;
    }

    return {
      check: checks[focusedIndex],
      project: focusedProject,
      index: focusedIndex,
    };
  }, [checks, focusedIndex, focusedProject]);

  const onFocusChange = useCallback((index: number | null) => {
    setFocusedIndex(index);
  }, []);

  return {
    checks,
    focusedIndex,
    focusedProject,
    focusedCheck,
    maxFocusableIndex,
    onFocusChange,
  };
}

interface ProjectRange {
  project: ProjectState;
  start: number;
  end: number;
}

function createProjectRanges(projects: ProjectState[]): ProjectRange[] {
  let start = 0;
  return projects.map((project) => {
    const end = start + project.checks.length;
    const range = { project, start, end };
    start = end;
    return range;
  });
}

function findProjectForCheckIndex(
  projectRanges: ProjectRange[],
  checkIndex: number,
): ProjectState | null {
  const match = projectRanges.find(
    ({ start, end }) => checkIndex >= start && checkIndex < end,
  );
  return match?.project ?? null;
}
