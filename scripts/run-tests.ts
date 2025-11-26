import { spawnSync } from "node:child_process";

const coverageExcludes = "src/**/*.{test.ts,test.tsx}";

const args = [
  "--test",
  "--test-reporter=dot",
  "--experimental-test-coverage",
  "--test-coverage-lines=95",
  "--test-coverage-branches=95",
  "--test-coverage-functions=95",
  `--test-coverage-exclude=${coverageExcludes}`,
  "src/**/*.{test.ts,test.tsx}",
  // Forward any additional CLI args so callers can tweak behavior.
  ...process.argv.slice(2),
];

const result = spawnSync("pnpm", ["exec", "tsx", ...args], {
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
