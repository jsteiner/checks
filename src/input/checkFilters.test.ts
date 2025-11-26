import assert from "node:assert/strict";
import test from "node:test";
import { filterProjectsByRules } from "./checkFilters.js";
import type { CheckFilterRule } from "./cli.js";
import { getDefaultProjectColor } from "./projectColors.js";

const sampleProjects = [
  {
    project: "web",
    path: "/tmp/web/checks.config.json",
    color: getDefaultProjectColor(0),
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
    color: getDefaultProjectColor(1),
    checks: [
      { name: "lint", command: "pnpm lint mobile" },
      { name: "test", command: "pnpm test mobile" },
    ],
  },
];

test("glob rules match checks and honor last rule wins", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "lint*" },
    { type: "exclude", pattern: "web/lint:*" },
    { type: "only", pattern: "web/lint:biome" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  const web = filtered.find((project) => project.project === "web");
  const mobile = filtered.find((project) => project.project === "mobile");

  assert.ok(web);
  assert.ok(mobile);
  assert.deepEqual(web?.checks.map((check) => check.name), ["lint:biome"]);
  assert.deepEqual(mobile?.checks.map((check) => check.name), ["lint"]);
});

test("single and double stars control depth of matches", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "lint*" },
    { type: "only", pattern: "lint**" },
    { type: "exclude", pattern: "web/lint:deep**" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);
  const web = filtered.find((project) => project.project === "web");
  const mobile = filtered.find((project) => project.project === "mobile");

  assert.ok(web);
  assert.ok(mobile);
  assert.deepEqual(web?.checks.map((check) => check.name), [
    "lint:biome",
    "lint:ast",
  ]);
  assert.deepEqual(mobile?.checks.map((check) => check.name), ["lint"]);
});

test("project patterns use the same glob rules", () => {
  const filters: CheckFilterRule[] = [
    { type: "only", pattern: "web*/lint:*" },
  ];

  const filtered = filterProjectsByRules(sampleProjects, filters);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.project, "web");
  assert.deepEqual(
    filtered[0]?.checks.map((check) => check.name),
    ["lint:biome", "lint:ast", "lint:deep:check"],
  );
});
