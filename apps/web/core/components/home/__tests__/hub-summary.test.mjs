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
