import assert from "node:assert/strict";
import test from "node:test";
import { filterProjectsByRules } from "./checkFilters.js";
import type { CheckFilterRule } from "./cli.js";

const sampleProjects = [
  {
    project: "web",
    path: "foo",
    checks: [
      { name: "lint", command: "foo" },
      { name: "lint:biome", command: "foo" },
      { name: "lint:ast", command: "foo" },
      { name: "lint:deep:check", command: "foo" },
      { name: "typecheck", command: "foo" },
    ],
  },
  {
    project: "mobile",
    path: "foo",
    checks: [
      { name: "lint", command: "foo" },
      { name: "lint:biome", command: "foo" },
      { name: "test", command: "foo" },
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

test("filters by check globs", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "lint*" },
    { type: "only", pattern: "lint**" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    {
      project: "web",
      checks: ["lint", "lint:biome", "lint:ast", "lint:deep:check"],
    },
    { project: "mobile", checks: ["lint", "lint:biome"] },
  ]);
});

test("exclude overrides only", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "lint*" },
    { type: "exclude", pattern: "web/lint**" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [{ project: "mobile", checks: ["lint", "lint:biome"] }]);
});

test("filters by project globs", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "we*/lint**" },
    { type: "only", pattern: "mo**/lint" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    {
      project: "web",
      checks: ["lint", "lint:biome", "lint:ast", "lint:deep:check"],
    },
    { project: "mobile", checks: ["lint"] },
  ]);
});

test("filters by project only glob", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "web/**" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    {
      project: "web",
      checks: ["lint", "lint:biome", "lint:ast", "lint:deep:check", "typecheck"],
    },
  ]);
});

test("preserves other project fields", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "web/lint*" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assert.equal(filtered[0]?.path, "foo");
});
