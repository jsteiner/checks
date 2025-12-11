import { availableParallelism } from "node:os";
import { Command } from "commander";
import packageJson from "../../package.json" with { type: "json" };

export type CheckFilterRule = {
  type: "only" | "exclude";
  pattern: string;
};

export interface CLIOptions {
  interactive: boolean;
  failFast: boolean;
  recursive: boolean;
  concurrency: number;
  filters: CheckFilterRule[];
  directory: string;
  configFileName: string;
}

function getDefaultConcurrency(): number {
  return Math.max(1, Math.floor(availableParallelism() * 0.75));
}

export function parseCLIOptions(argv: string[]): CLIOptions {
  const program = new Command();

  program
    .name("checks")
    .version(packageJson.version, "-v, --version", "display version number")
    .argument(
      "[directory]",
      "directory to run checks from (default: current directory)",
    )
    .helpOption("-h, --help", "display this help message")
    .option("-i, --interactive", "run in interactive mode", false)
    .option(
      "-f, --fail-fast",
      "abort remaining checks after the first failure",
      false,
    )
    .option(
      "-r, --recursive",
      "include checks from directories listed in the 'children' field",
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
    )
    .option(
      "-c, --concurrency <number>",
      "maximum number of checks to run concurrently (default: 75% of CPUs)",
      String(getDefaultConcurrency()),
    );

  program.parse(argv);

  const {
    only,
    exclude,
    concurrency: concurrencyStr,
    ...base
  } = program.opts<{
    interactive: boolean;
    failFast: boolean;
    recursive: boolean;
    concurrency: string;
    only: string[];
    exclude: string[];
  }>();

  const concurrency = parseConcurrency(concurrencyStr);
  const [directory = "."] = program.args;

  return {
    ...base,
    concurrency,
    filters: toFilterRules(only, exclude),
    directory,
    configFileName: "checks.config.json",
  };
}

function parseConcurrency(value: string): number {
  if (value === "Infinity") {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(
      `--concurrency must be a positive integer or "Infinity", got: ${value}`,
    );
  }

  return parsed;
}

function toFilterRules(only: string[], exclude: string[]): CheckFilterRule[] {
  const from = (patterns: string[], type: CheckFilterRule["type"]) =>
    patterns
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern.length > 0)
      .map((pattern) => ({ type, pattern }));

  return [...from(only, "only"), ...from(exclude, "exclude")];
}
