import { useMemo } from "react";
import type { CheckState, ProjectState } from "../../types.js";

interface FocusedCheck {
  check: CheckState;
  project: ProjectState;
  index: number;
}

interface UseFocusResult {
  checks: CheckState[];
  focusedCheck: FocusedCheck | null;
  maxFocusableIndex: number;
}

export function useFocus(
  projects: ProjectState[],
  focusedIndex: number | null,
): UseFocusResult {
  const projectRanges = useMemo(
    () => createProjectRanges(projects),
    [projects],
  );
  const checks = useMemo(
    () => projects.flatMap((project) => project.checks),
    [projects],
  );
  const focusableCount = Math.min(checks.length, 9);
  const maxFocusableIndex = focusableCount - 1;

  const focusedCheck = useMemo(() => {
    if (focusedIndex === null || checks[focusedIndex] === undefined) {
      return null;
    }

    const focusedProject = findProjectForCheckIndex(
      projectRanges,
      focusedIndex,
    );

    if (focusedProject === null) {
      return null;
    }

    return {
      check: checks[focusedIndex],
      project: focusedProject,
      index: focusedIndex,
    };
  }, [checks, focusedIndex, projectRanges]);

  return {
    checks,
    focusedCheck,
    maxFocusableIndex,
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
