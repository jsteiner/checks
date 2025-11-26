import assert from "node:assert/strict";
import test from "node:test";
import { filterProjectsByRules } from "./checkFilters.js";
import type { CheckFilterRule } from "./cli.js";

const sampleProjects = [
  {
    project: "web",
    path: "/tmp/web/checks.config.json",
    color: "red",
    checks: [
      { name: "lint:biome", command: "pnpm lint web" },
      { name: "lint:ast", command: "pnpm lint web --ast" },
      { name: "lint:deep:check", command: "pnpm lint web --deep" },
      { name: "typecheck", command: "pnpm typecheck web" },
    ],
  },
  {
    project: "mobile",
    path: "/tmp/mobile/checks.config.json",
    color: "red",
    checks: [
      { name: "lint", command: "pnpm lint mobile" },
      { name: "test", command: "pnpm test mobile" },
    ],
  },
];

type Summary = { project: string; checks: string[] };

const summarize = (projects: typeof sampleProjects): Summary[] =>
  projects.map((project) => ({
    project: project.project,
    checks: project.checks.map((check) => check.name),
  }));

function assertFiltered(
  projects: typeof sampleProjects,
  expected: Summary[],
): void {
  assert.deepEqual(summarize(projects), expected);
}

test("filters by only and exclude options", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "web/lint:*" },
    { type: "exclude", pattern: "*/lint:deep**" },
    { type: "only", pattern: "mobile/lint" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assert.deepEqual(filtered, [
    {
      project: "web",
      path: "/tmp/web/checks.config.json",
      color: "red",
      checks: [
        { name: "lint:biome", command: "pnpm lint web" },
        { name: "lint:ast", command: "pnpm lint web --ast" },
      ],
    },
    {
      project: "mobile",
      path: "/tmp/mobile/checks.config.json",
      color: "red",
      checks: [{ name: "lint", command: "pnpm lint mobile" }],
    },
  ]);
});

test("glob rules match checks and honor last rule wins", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "lint*" },
    { type: "exclude", pattern: "web/lint:*" },
    { type: "only", pattern: "web/lint:biome" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    { project: "web", checks: ["lint:biome"] },
    { project: "mobile", checks: ["lint"] },
  ]);
});

test("single and double stars control depth of matches", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "lint*" },
    { type: "only", pattern: "lint**" },
    { type: "exclude", pattern: "web/lint:deep**" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    { project: "web", checks: ["lint:biome", "lint:ast"] },
    { project: "mobile", checks: ["lint"] },
  ]);
});

test("project patterns use the same glob rules", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "web*/lint:*" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    { project: "web", checks: ["lint:biome", "lint:ast", "lint:deep:check"] },
  ]);
});
