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
  const filters: CheckFilterRule[] = [];
  const collectFilter =
    (type: CheckFilterRule["type"]) => (value: string, previous: string[]) => {
      const pattern = value.trim();
      if (pattern.length > 0) {
        filters.push({ type, pattern });
      }
      return [...previous, value];
    };

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
      "--only <pattern>",
      "only run checks whose name matches this pattern (repeatable)",
      collectFilter("only"),
      [],
    )
    .option(
      "--exclude <pattern>",
      "skip checks whose name matches this pattern (repeatable)",
      collectFilter("exclude"),
      [],
    );

  program.parse(argv);

  const { interactive, failFast, recursive } = program.opts<{
    interactive: boolean;
    failFast: boolean;
    recursive: boolean;
  }>();

  return { interactive, failFast, recursive, filters };
}
