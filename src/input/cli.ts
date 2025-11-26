import { Command } from "commander";

export type CheckFilterRule = {
  type: "only" | "exclude";
  pattern: string;
};

export interface CLIOptions {
  interactive: boolean;
  failFast: boolean;
  recursive: boolean;
  filters: CheckFilterRule[];
}

export function parseCLIOptions(argv: string[]): CLIOptions {
  const program = new Command();

  program
    .name("checks")
    .helpOption("-h, --help", "display this help message")
    .option("-i, --interactive", "run in interactive mode", false)
    .option(
      "-f, --fail-fast",
      "abort remaining checks after the first failure",
      false,
    )
    .option(
      "-r, --recursive",
      "recursively search for and run checks in child directories",
      false,
    )
    .option(
      "-o, --only <pattern...>",
      "only run checks whose name matches this pattern",
      [],
    )
    .option(
      "-e, --exclude <pattern...>",
      "skip checks whose name matches this pattern",
      [],
    );

  program.parse(argv);

  const { only, exclude, ...base } = program.opts<{
    interactive: boolean;
    failFast: boolean;
    recursive: boolean;
    only: string[];
    exclude: string[];
  }>();

  return { ...base, filters: toFilterRules(only, exclude) };
}

function toFilterRules(only: string[], exclude: string[]): CheckFilterRule[] {
  const from = (patterns: string[], type: CheckFilterRule["type"]) =>
    patterns
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0)
      .map((pattern) => ({ type, pattern }));

  return [...from(only, "only"), ...from(exclude, "exclude")];
}
