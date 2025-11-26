import type { ProjectDefinition } from "../types.js";
import type { CheckFilterRule } from "./cli.js";

export function filterProjectsByRules(
  projects: ProjectDefinition[],
  filters: CheckFilterRule[],
): ProjectDefinition[] {
  if (filters.length === 0) {
    return projects;
  }

  const compiled = filters.map(compileRule);
  const predicates = {
    only: compiled.filter((rule) => rule.type === "only"),
    exclude: compiled.filter((rule) => rule.type === "exclude"),
  };

  return projects
    .map((project) => ({
      ...project,
      checks: project.checks.filter((check) =>
        shouldIncludeCheck(predicates, project.project, check.name),
      ),
    }))
    .filter((project) => project.checks.length > 0);
}

type RulePredicates = {
  only: CompiledRule[];
  exclude: CompiledRule[];
};

function shouldIncludeCheck(
  predicates: RulePredicates,
  projectName: string,
  checkName: string,
): boolean {
  const hasOnlyRules = predicates.only.length > 0;
  const matchesOnly =
    !hasOnlyRules ||
    predicates.only.some((rule) => matchesRule(rule, projectName, checkName));

  if (!matchesOnly) {
    return false;
  }

  return !predicates.exclude.some((rule) =>
    matchesRule(rule, projectName, checkName),
  );
}

type CompiledRule = CheckFilterRule & {
  projectPattern: RegExp | undefined;
  checkPattern: RegExp;
};

function compileRule(rule: CheckFilterRule): CompiledRule {
  if (!rule.pattern.includes("/")) {
    const checkGlob = rule.pattern.length > 0 ? rule.pattern : "**";
    return {
      ...rule,
      projectPattern: undefined,
      checkPattern: globToRegExp(checkGlob),
    };
  }

  const [projectGlob = "", rawCheckGlob = ""] = rule.pattern.split("/", 2);
  const projectPattern =
    projectGlob.length > 0 ? globToRegExp(projectGlob) : undefined;
  const checkPattern = globToRegExp(
    rawCheckGlob.length > 0 ? rawCheckGlob : "**",
  );

  return {
    ...rule,
    projectPattern,
    checkPattern,
  };
}

function matchesRule(
  rule: CompiledRule,
  projectName: string,
  checkName: string,
): boolean {
  const projectMatches = rule.projectPattern
    ? rule.projectPattern.test(projectName)
    : true;

  const checkMatches = rule.checkPattern.test(checkName);

  return projectMatches && checkMatches;
}

function globToRegExp(glob: string): RegExp {
  if (glob.match(/\*[^*]+/)) {
    throw new Error(
      `Invalid glob pattern "${glob}". Globs are not allowed mid-string.`,
    );
  }
  let regexp = glob.replace(/\*\*$/, ".*");
  if (regexp === glob) {
    regexp = regexp.replace(/\*$/, ":?\\w*");
  }
  return new RegExp(`^${regexp}$`);
}
