export const DEFAULT_PROJECT_COLORS = ["blue", "magenta", "cyan"] as const;

export type ProjectColor = string;

export function getProjectColor(index: number): ProjectColor {
  return DEFAULT_PROJECT_COLORS[
    index % DEFAULT_PROJECT_COLORS.length
  ] as ProjectColor;
}
