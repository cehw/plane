import test from "node:test";
import assert from "node:assert/strict";
import {
  RESEARCH_PROJECT_GROUPS,
  PERSONAL_PROJECTS,
  STELLERUS_PROJECTS,
  PROJECT_SCOPES,
  getProjectScope,
  scopeProjectIds,
} from "../project-scopes.ts";

test("each existing work line has one scope and one research subgroup", () => {
  const research = RESEARCH_PROJECT_GROUPS.flatMap((group) => group.projects);
  const names = [...research, ...PERSONAL_PROJECTS, ...STELLERUS_PROJECTS];
  assert.equal(new Set(names).size, names.length);
  for (const name of research) assert.equal(getProjectScope(name), "research");
  for (const name of PERSONAL_PROJECTS) assert.equal(getProjectScope(name), "personal");
  for (const name of STELLERUS_PROJECTS) assert.equal(getProjectScope(name), "stellerus");
  assert.equal(getProjectScope("新建项目"), "other");
});

test("scope intersects native filters and keeps their sort order", () => {
  const projects = new Map([
    ["hima", { name: "Himawari" }],
    ["grl", { name: "GRL 修订" }],
    ["wind", { name: "Stellerus 风电" }],
    ["new", { name: "新建项目" }],
  ]);
  const get = (id) => projects.get(id);
  const nativeFiltered = ["grl", "wind", "hima"];
  assert.deepEqual(scopeProjectIds(nativeFiltered, get, "research"), ["grl", "hima"]);
  assert.deepEqual(scopeProjectIds(nativeFiltered, get, "other"), []);
  assert.deepEqual(scopeProjectIds(["wind"], get, "research"), []);
  assert.equal(scopeProjectIds(nativeFiltered, get, "all"), nativeFiltered);
  const partition = PROJECT_SCOPES.filter(({ id }) => id !== "all").flatMap(({ id }) =>
    scopeProjectIds([...projects.keys()], get, id),
  );
  assert.equal(partition.length, projects.size);
  assert.equal(new Set(partition).size, projects.size);
  assert.equal(scopeProjectIds(undefined, get, "research"), undefined);
  assert.deepEqual(scopeProjectIds(["missing", "new"], get, "other"), ["new"]);
});
