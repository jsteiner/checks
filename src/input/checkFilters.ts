import type { ProjectDefinition } from "../types.js";
import type { CheckFilterRule } from "./cli.js";

export function filterProjectsByRules(
  projects: ProjectDefinition[],
  filters: CheckFilterRule[],
): ProjectDefinition[] {
  if (filters.length === 0) {
    return projects;
  }

  const hasOnlyRule = filters.some((filter) => filter.type === "only");

  return projects
    .map((project) => ({
      ...project,
      checks: project.checks.filter((check) =>
        shouldIncludeCheck(project.project, check.name, filters, hasOnlyRule),
      ),
    }))
    .filter((project) => project.checks.length > 0);
}

function shouldIncludeCheck(
  projectName: string,
  checkName: string,
  filters: CheckFilterRule[],
  hasOnlyRule: boolean,
): boolean {
  let include = hasOnlyRule ? false : true;

  for (const filter of filters) {
    if (!matches(filter.pattern, projectName, checkName)) continue;
    include = filter.type === "only";
  }

  return include;
}

function matches(pattern: string, projectName: string, checkName: string) {
  const { projectPattern, checkPattern } = splitPattern(pattern);
  const projectMatches = projectPattern
    ? globMatches(projectName, projectPattern)
    : true;
  const checkMatches = globMatches(checkName, checkPattern);

  return projectMatches && checkMatches;
}

function splitPattern(pattern: string): {
  projectPattern: string | null;
  checkPattern: string;
} {
  const separatorIndex = pattern.indexOf("/");
  if (separatorIndex === -1) {
    return { projectPattern: null, checkPattern: pattern };
  }

  const projectPattern = pattern.slice(0, separatorIndex) || null;
  const checkPattern = pattern.slice(separatorIndex + 1);
  return { projectPattern, checkPattern };
}

function globMatches(value: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(value);
}

function globToRegex(pattern: string): RegExp {
  let regex = "^";

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === "*") {
      const next = pattern[i + 1];
      if (next === "*") {
        regex += ".*";
        i += 1;
      } else {
        regex += "[^:]*:?[^:]*";
      }
      continue;
    }

    if ("\\.^$+?()[]{}".includes(char)) {
      regex += "\\";
    }
    regex += char;
  }

  regex += "$";
  return new RegExp(regex);
}
