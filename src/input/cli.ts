import { Command } from "commander";

export interface CLIOptions {
  interactive: boolean;
  failFast: boolean;
  recursive: boolean;
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
    );

  program.parse(argv);

  return program.opts<CLIOptions>();
}
