import path from "node:path";
import type { ProjectDefinition, SuiteDefinition } from "../types.js";
import { filterProjectsByRules } from "./checkFilters.js";
import { type CLIOptions, parseCLIOptions } from "./cli.js";
import { discoverConfigPaths } from "./discoverConfigPaths.js";
import { FileConfigError, loadFileConfig } from "./fileConfig.js";
import { getProjectColor } from "./projectColors.js";

export interface Input extends SuiteDefinition {
  projects: ProjectDefinition[];
  options: CLIOptions;
}

export async function buildInput(
  argv: string[] = process.argv,
): Promise<Input> {
  const options = parseCLIOptions(argv);

  const paths = await discoverConfigPaths(
    options.directory,
    options.configFileName,
    options.recursive,
  );
  const projectsFromConfig: ProjectDefinition[] = await Promise.all(
    paths.map(async (configFilePath, index) => {
      const config = await loadFileConfig(configFilePath);
      const cwd = path.dirname(configFilePath);
      return {
        project: config.project,
        color: config.color ?? getProjectColor(index),
        path: configFilePath,
        checks: config.checks.map((check) => {
          return {
            name: check.name,
            command: check.command,
            cwd,
            ...(check.timeout ? { timeout: check.timeout } : {}),
          };
        }),
      };
    }),
  );

  const totalChecks = projectsFromConfig.reduce(
    (sum, project) => sum + project.checks.length,
    0,
  );

  const projects: ProjectDefinition[] = filterProjectsByRules(
    projectsFromConfig,
    options.filters,
  );

  const filteredChecks = projects.reduce(
    (sum, project) => sum + project.checks.length,
    0,
  );

  if (filteredChecks === 0) {
    if (totalChecks === 0) {
      throw new FileConfigError(
        `No checks defined in ${paths.length === 1 ? paths[0] : "the discovered config files"}. Add at least one check to run.`,
      );
    }

    const filtersDescription =
      options.filters.length === 0
        ? ""
        : ` after applying filters (${options.filters
            .map(
              (rule) =>
                `${rule.type === "only" ? "--only" : "--exclude"} ${rule.pattern}`,
            )
            .join(", ")})`;

    throw new FileConfigError(
      `No checks matched${filtersDescription}. Adjust your patterns or remove filters to run checks.`,
    );
  }

  return { projects, options };
}
