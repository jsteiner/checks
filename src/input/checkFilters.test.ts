import assert from "node:assert/strict";
import test from "node:test";
import { filterProjectsByRules } from "./checkFilters.js";
import type { CheckFilterRule } from "./cli.js";

const sampleChecks = [
  { name: "lint", command: "foo" },
  { name: "lint:deep", command: "foo" },
  { name: "lint:deep:check", command: "foo" },
  { name: "test", command: "foo" },
  { name: "test:deep", command: "foo" },
  { name: "test:deep:check", command: "foo" },
];

const sampleProjects = [
  { project: "alpha", path: "foo", color: "red", checks: sampleChecks },
  { project: "alpha:web", path: "foo", color: "red", checks: sampleChecks },
  { project: "alphabet", path: "foo", color: "red", checks: sampleChecks },
  { project: "beta", path: "foo", color: "red", checks: sampleChecks },
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

test("filters projects and checks together", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "alpha/lint" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [{ project: "alpha", checks: ["lint"] }]);
});

test("filters checks by exact matches", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "lint" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    { project: "alpha", checks: ["lint"] },
    { project: "alpha:web", checks: ["lint"] },
    { project: "alphabet", checks: ["lint"] },
    { project: "beta", checks: ["lint"] },
  ]);
});

test("filters checks by single glob matches with an optional first :", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "lint*" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    { project: "alpha", checks: ["lint", "lint:deep"] },
    { project: "alpha:web", checks: ["lint", "lint:deep"] },
    { project: "alphabet", checks: ["lint", "lint:deep"] },
    { project: "beta", checks: ["lint", "lint:deep"] },
  ]);
});

test("throws on globs mid-string", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "li*:deep" }];

  assert.throws(
    () => filterProjectsByRules(sampleProjects, filters),
    /Invalid glob pattern "li\*:deep"\. Globs are not allowed mid-string\./,
  );
});

test("throws on double globs mid-string", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "**p" }];

  assert.throws(
    () => filterProjectsByRules(sampleProjects, filters),
    /Invalid glob pattern "\*\*p"\. Globs are not allowed mid-string\./,
  );
});

test("filters checks by double glob matches with an optional first :", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "lint**" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    { project: "alpha", checks: ["lint", "lint:deep", "lint:deep:check"] },
    {
      project: "alpha:web",
      checks: ["lint", "lint:deep", "lint:deep:check"],
    },
    { project: "alphabet", checks: ["lint", "lint:deep", "lint:deep:check"] },
    { project: "beta", checks: ["lint", "lint:deep", "lint:deep:check"] },
  ]);
});

test("including an : does not include the bare term", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "lint:*" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    { project: "alpha", checks: ["lint:deep"] },
    { project: "alpha:web", checks: ["lint:deep"] },
    { project: "alphabet", checks: ["lint:deep"] },
    { project: "beta", checks: ["lint:deep"] },
  ]);
});

test("filters projects with glob matches", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "alpha*/**" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    {
      project: "alpha",
      checks: [
        "lint",
        "lint:deep",
        "lint:deep:check",
        "test",
        "test:deep",
        "test:deep:check",
      ],
    },
    {
      project: "alpha:web",
      checks: [
        "lint",
        "lint:deep",
        "lint:deep:check",
        "test",
        "test:deep",
        "test:deep:check",
      ],
    },
    {
      project: "alphabet",
      checks: [
        "lint",
        "lint:deep",
        "lint:deep:check",
        "test",
        "test:deep",
        "test:deep:check",
      ],
    },
  ]);
});

test("exclude overrides only", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "lint" },
    { type: "exclude", pattern: "alpha/lint" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [
    { project: "alpha:web", checks: ["lint"] },
    { project: "alphabet", checks: ["lint"] },
    { project: "beta", checks: ["lint"] },
  ]);
});

test("preserves other project fields", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "alphabet/lint" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assert.equal(filtered[0]?.path, "foo");
});
