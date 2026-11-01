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
