import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareTimelineItems,
  timelineDateLabel,
  timelineInitialDate,
} from "../hub-home-timeline.helpers.ts";
test("timeline keeps missing dates missing and distinguishes start from target", () => {
  const start = { id: "start", name: "Start", start_date: "2026-10-05", target_date: null };
  const due = { id: "due", name: "Due", start_date: null, target_date: "2026-11-02" };
  const unknown = { id: "unknown", name: "Unknown", start_date: null, target_date: null };
  const prepared = prepareTimelineItems([start, due, unknown, start]);
  assert.equal(prepared.dated.length, 2);
  assert.deepEqual(prepared.undated, [unknown]);
  assert.equal(start.target_date, null);
  assert.equal(due.start_date, null);
  assert.equal(timelineDateLabel(start), "仅开始 2026-10-05");
  assert.equal(timelineDateLabel(due), "仅截止 2026-11-02");
  assert.equal(timelineDateLabel(unknown), "未定日期");
});
test("initial viewport locates actual historical dates without changing them", () => {
  assert.equal(
    timelineInitialDate([{ start_date: "2025-01-01", target_date: "2025-02-01" }], "2026-11-01"),
    "2025-02-01",
  );
  assert.equal(
    timelineInitialDate([{ start_date: "2026-10-01", target_date: "2026-12-01" }], "2026-11-01"),
    "2026-11-01",
  );
  assert.equal(timelineInitialDate([{ target_date: "2026-12-01" }], "2026-11-01"), "2026-12-01");
  assert.equal(timelineInitialDate([], "2026-11-01"), undefined);
});


import { buildTimelineEntries, buildTimelineTree, flattenTimelineTree, timelineEntryHref, timelineSummarySegments } from "../hub-home-timeline.helpers.ts";
const projects = [
  { id: "hima", name: "Himawari" }, { id: "wind", name: "Stellerus 风电" },
  { id: "clp", name: "Stellerus CLP" }, { id: "misc", name: "新项目" },
];
const record = (id, overrides = {}) => ({ id, project: "Himawari", project_id: "hima", title: id, kind: "已做", start: "2026-10-01", end: "2026-10-01", ...overrides });

test("source work records keep their own dates and kind instead of native completion status", () => {
  const original = record("r", { issue_id: "mapped", kind: "计划", start: "2026-10-02", end: "2026-10-03" });
  const issue = { id: "mapped", project_id: "hima", name: "native", start_date: "2026-11-01", target_date: "2026-11-02", completed_at: "2026-11-02" };
  const current = { id: "next", project_id: "hima", name: "current", start_date: null, target_date: null };
  const prepared = buildTimelineEntries([original, original], [issue, current, current], projects);
  assert.equal(prepared.dated.length, 1);
  assert.equal(prepared.dated[0].kind, "计划");
  assert.equal(prepared.dated[0].start_date, "2026-10-02");
  assert.equal(prepared.dated[0].target_date, "2026-10-03");
  assert.equal(prepared.undated.length, 1);
  assert.equal(current.start_date, null);
  assert.equal(issue.start_date, "2026-11-01");
});

test("Stellerus is grouped by site scope across source projects exactly once", () => {
  const prepared = buildTimelineEntries([
    record("wind-a", { project: "Stellerus 风电", project_id: "wind", siteScope: "HK-CLP Ta" }),
    record("clp-a", { project: "Stellerus CLP", project_id: "clp", siteScope: "HK-CLP Ta" }),
    record("wind-b", { project: "Stellerus 风电", project_id: "wind", siteScope: "Jiangsu wind multiple" }),
    record("hima-a"),
  ], [], projects);
  const tree = buildTimelineTree(prepared.dated);
  const stellerus = tree.find((node) => node.id === "category:stellerus");
  assert.equal(stellerus.entries.length, 3);
  assert.deepEqual(stellerus.children.map((node) => node.name), ["HK-CLP Ta", "Jiangsu wind multiple"]);
  assert.equal(stellerus.children[0].entries.length, 2);
  assert.equal(new Set(stellerus.children.flatMap((node) => node.entries.map((entry) => entry.id))).size, 3);
  const research = tree.find((node) => node.id === "category:research");
  assert.equal(research.children[0].name, "Ongoing");
  assert.equal(research.children[0].children[0].name, "Himawari");
});

test("group expansion changes display rows without losing or changing records", () => {
  const prepared = buildTimelineEntries([record("a"), record("b", { project: "新项目", project_id: "misc" })], [], projects);
  const tree = buildTimelineTree(prepared.dated);
  assert.deepEqual(flattenTimelineTree(tree, new Set()).map((row) => row.name), ["科研", "待归类"]);
  const rows = flattenTimelineTree(tree, new Set(["category:research", "category:ongoing", "lane:ongoing:Himawari"]));
  assert.deepEqual(rows.map((row) => row.name), ["科研", "Ongoing", "Himawari", "a", "待归类"]);
  assert.equal(rows.find((row) => row.type === "entry").start_date, "2026-10-01");
});

test("summary segments preserve gaps and make coincident records selectable", () => {
  const prepared = buildTimelineEntries([
    record("a"), record("b"),
    record("later", { start: "2026-10-10", end: "2026-10-11", kind: "汇报" }),
  ], [], projects);
  const row = buildTimelineTree(prepared.dated)[0];
  const segments = timelineSummarySegments(row);
  assert.equal(segments.length, 2);
  assert.deepEqual(segments[0].entries.map((entry) => entry.id).sort(), ["record:a", "record:b"]);
  assert.equal(segments[0].left, 0);
  assert.equal(segments[0].width, 100 / 11);
  assert.equal(segments[1].start, "2026-10-10");
  assert.equal(segments[1].end, "2026-10-11");
  assert.ok(segments[0].left + segments[0].width < segments[1].left);
});

test("partially overlapping ranges retain every record and exact endpoints", () => {
  const prepared = buildTimelineEntries([
    record("wide", { start: "2026-10-01", end: "2026-10-03" }),
    record("middle", { start: "2026-10-02", end: "2026-10-02" }),
  ], [], projects);
  const segments = timelineSummarySegments(buildTimelineTree(prepared.dated)[0]);
  assert.deepEqual(segments.map((segment) => [segment.start, segment.end, segment.entries.length]), [
    ["2026-10-01", "2026-10-01", 1], ["2026-10-02", "2026-10-02", 2], ["2026-10-03", "2026-10-03", 1],
  ]);
  assert.equal(prepared.dated.find((entry) => entry.name === "wide").target_date, "2026-10-03");
});

test("record navigation uses real issue then Page then visible project", () => {
  const entry = buildTimelineEntries([record("a", { issue_id: "issue-a", page_id: "page-a" })], [], projects).dated[0];
  assert.equal(timelineEntryHref("hub", entry), "/hub/projects/hima/issues/issue-a/");
  assert.equal(timelineEntryHref("hub", { ...entry, issue_id: undefined }), "/hub/projects/hima/pages/page-a/");
  assert.equal(timelineEntryHref("hub", { ...entry, issue_id: undefined, page_id: undefined }), "/hub/projects/hima/issues/");
  assert.equal(buildTimelineEntries([record("hidden", { project_id: "invisible" })], [], projects).dated.length, 0);
});
