import assert from "node:assert/strict";
import { test } from "vitest";
import { filterProjectsByRules } from "./checkFilters.js";
import type { CheckFilterRule } from "./cli.js";

const sampleChecks = [
  { name: "lint", command: "foo", cwd: "/tmp/project" },
  { name: "lint:deep", command: "foo", cwd: "/tmp/project" },
  { name: "lint:deep:check", command: "foo", cwd: "/tmp/project" },
  { name: "test", command: "foo", cwd: "/tmp/project" },
  { name: "test:deep", command: "foo", cwd: "/tmp/project" },
  { name: "test:deep:check", command: "foo", cwd: "/tmp/project" },
];

const sampleProjects = [
  { project: "alpha", path: "foo", color: "red", checks: sampleChecks },
  { project: "alpha:web", path: "foo", color: "red", checks: sampleChecks },
  { project: "alphabet", path: "foo", color: "red", checks: sampleChecks },
  { project: "beta", path: "foo", color: "red", checks: sampleChecks },
];

const projectNames = ["alpha", "alpha:web", "alphabet", "beta"] as const;

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

function expectAllProjectsWithChecks(checkNames: string[]): Summary[] {
  return projectNames.map((project) => ({ project, checks: checkNames }));
}

test("handles empty pattern", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  // Empty pattern should match all checks
  assertFiltered(filtered, [
    { project: "alpha", checks: sampleChecks.map((c) => c.name) },
    { project: "alpha:web", checks: sampleChecks.map((c) => c.name) },
    { project: "alphabet", checks: sampleChecks.map((c) => c.name) },
    { project: "beta", checks: sampleChecks.map((c) => c.name) },
  ]);
});

test("handles pattern with empty project glob", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "/lint" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, expectAllProjectsWithChecks(["lint"]));
});

test("handles pattern with empty check glob", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "alpha/" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  // alpha/ should match all checks in alpha project
  assertFiltered(filtered, [
    { project: "alpha", checks: sampleChecks.map((c) => c.name) },
  ]);
});

test("filters projects and checks together", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "alpha/lint" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, [{ project: "alpha", checks: ["lint"] }]);
});

test("filters checks by exact matches", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "lint" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, expectAllProjectsWithChecks(["lint"]));
});

test("filters checks by single glob matches with an optional first :", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "lint*" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, expectAllProjectsWithChecks(["lint", "lint:deep"]));
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

  assertFiltered(
    filtered,
    expectAllProjectsWithChecks(["lint", "lint:deep", "lint:deep:check"]),
  );
});

test("including an : does not include the bare term", () => {
  const filters: CheckFilterRule[] = [{ type: "only", pattern: "lint:*" }];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assertFiltered(filtered, expectAllProjectsWithChecks(["lint:deep"]));
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
