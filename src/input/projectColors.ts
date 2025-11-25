export const DEFAULT_PROJECT_COLORS = [
  "cyan",
  "magenta",
  "blue",
  "grey",
] as const;

export type ProjectColor = string;

export function getDefaultProjectColor(index: number): ProjectColor {
  return DEFAULT_PROJECT_COLORS[index] ?? DEFAULT_PROJECT_COLORS[0];
}

export function resolveProjectColor(
  requestedColor: string | undefined,
  index: number,
): ProjectColor {
  return requestedColor ?? getDefaultProjectColor(index);
}
