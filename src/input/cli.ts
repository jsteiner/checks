import { Command } from "commander";

export interface CLIOptions {
  interactive: boolean;
}

export function parseCLIOptions(argv: string[]): CLIOptions {
  const program = new Command();

  program
    .name("checks")
    .option("-i, --interactive", "run in interactive mode", false)
    .parse(argv);

  return program.opts<CLIOptions>();
}
