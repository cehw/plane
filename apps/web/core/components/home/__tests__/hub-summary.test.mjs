import test from "node:test";
import assert from "node:assert/strict";
import { collectorHealth, backupHealth, latestRecords } from "../hub-summary.helpers.ts";

const now = Date.parse("2026-11-01T08:00:00Z");
const fixture = () => ({
  generated_at: "2026-11-01T07:55:00Z",
  netatmo: {
    service: "active",
    collector: { last_observation_utc: "2026-11-01T07:55:00Z" },
    backup: { state: "SUCCESS", completed_utc: "2026-11-01T07:05:00Z" },
    backup_attempt: { state: "SUCCESS" },
  },
});
test("an active service with an old source snapshot is not shown as healthy", () => {
  const s = fixture();
  s.generated_at = "2026-11-01T05:00:00Z";
  assert.equal(collectorHealth(s, now).label, "状态已过期");
  assert.equal(backupHealth(s, now).label, "待核对");
});
test("a new failed backup is visible even when a previous success exists", () => {
  const s = fixture();
  s.netatmo.backup_attempt.state = "FAILED";
  assert.equal(backupHealth(s, now).tone, "bad");
});
test("active service with no recent observation is flagged", () => {
  const s = fixture();
  s.netatmo.collector.last_observation_utc = "2026-11-01T06:00:00Z";
  assert.equal(collectorHealth(s, now).label, "观测延迟");
});
test("missing snapshot is unknown rather than a fake zero or successful state", () => {
  assert.equal(collectorHealth(null, now).label, "等待同步");
  assert.equal(backupHealth(null, now).label, "等待同步");
});
test("fresh source and recent backup are healthy", () => {
  assert.equal(collectorHealth(fixture(), now).tone, "good");
  assert.equal(backupHealth(fixture(), now).tone, "good");
});
test("work history is sorted without interpreting historical kind as a current task", () => {
  const records = [
    { id: "old", start: "2026-01-01", end: "2026-01-01", kind: "进行中" },
    { id: "new", start: "2026-11-01", end: "2026-11-01", kind: "汇报" },
  ];
  assert.deepEqual(
    latestRecords(records).map((r) => r.id),
    ["new", "old"],
  );
  assert.equal(records[0].id, "old");
});

test("empty task set is not falsely complete", async () => {
  const { completionPercent } = await import("../hub-summary.helpers.ts");
  assert.equal(completionPercent(0, 0), null);
  assert.equal(completionPercent(1, 4), 25);
  assert.equal(completionPercent(4, 4), 100);
});

test("featured progress prioritizes active projects then recent records, limits to four and excludes empty projects", async () => {
  const { featuredProjects } = await import("../hub-summary.helpers.ts");
  const projects = [
    { id: "old", name: "Old", open: 1, completed: 0, next: null },
    { id: "empty", name: "Empty", open: 0, completed: 0, next: null },
    { id: "recent", name: "Recent", open: 1, completed: 1, next: null },
    { id: "active", name: "Active", open: 1, completed: 0, next: { state__group: "started" } },
    { id: "done", name: "Done", open: 0, completed: 2, next: null },
    { id: "older", name: "Older", open: 1, completed: 0, next: null },
  ];
  const records = [
    { project: "Old", end: "2026-10-01" },
    { project: "Recent", end: "2026-11-01" },
    { project: "Recent", end: "2026-09-01" },
    { project: "Done", end: "2026-10-20" },
    { project: "Empty", end: "2026-11-02" },
  ];
  assert.deepEqual(
    featuredProjects(projects, records).map((p) => p.id),
    ["active", "recent", "done", "old"],
  );
  assert.equal(projects[0].id, "old");
  assert.deepEqual(featuredProjects([], []), []);
});
