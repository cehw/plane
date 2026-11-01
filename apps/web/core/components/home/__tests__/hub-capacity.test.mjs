import test from "node:test";
import assert from "node:assert/strict";
import { capacityPercent, capacityIsStale } from "../hub-summary.helpers.ts";
test("quota percentage distinguishes unknown, zero and overage", () => {
  assert.equal(capacityPercent(14.857, 20).toFixed(1), "74.3");
  assert.equal(capacityPercent(0, 20), 0);
  assert.equal(capacityPercent(undefined, 20), null);
  assert.equal(capacityPercent(5, 0), null);
  assert.equal(capacityPercent(-1, 20), null);
  assert.equal(capacityPercent(NaN, 20), null);
  assert.equal(capacityPercent(21, 20), 105);
});
test("manual quota and live volume have independent freshness thresholds", () => {
  const now = Date.parse("2026-11-02T10:00:00Z");
  assert.equal(capacityIsStale("2026-11-01T10:45:37Z", 1440, now), false);
  assert.equal(capacityIsStale("2026-11-01T09:00:00Z", 1440, now), true);
  assert.equal(capacityIsStale("2026-11-02T08:00:00Z", 90, now), true);
  assert.equal(capacityIsStale(undefined, 1440, now), true);
});
