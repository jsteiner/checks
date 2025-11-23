import { Command } from "commander";

export interface CLIOptions {
  interactive: boolean;
  failFast: boolean;
}

export function parseCLIOptions(argv: string[]): CLIOptions {
  const program = new Command();

  program
    .name("checks")
    .option("-i, --interactive", "run in interactive mode", false)
    .option(
      "-f, --fail-fast",
      "abort remaining checks after the first failure",
      false,
    );

  program.parse(argv);

  return program.opts<CLIOptions>();
}
