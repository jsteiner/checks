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
  const qualifiedName = `${projectName}:${checkName}`;
  let include = hasOnlyRule ? false : true;

  for (const filter of filters) {
    if (!matches(filter.pattern, checkName, qualifiedName)) continue;
    include = filter.type === "only";
  }

  return include;
}

function matches(pattern: string, checkName: string, qualifiedName: string) {
  return checkName.includes(pattern) || qualifiedName.includes(pattern);
}
