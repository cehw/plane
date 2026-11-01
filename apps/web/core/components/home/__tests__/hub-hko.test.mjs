import test from "node:test";
import assert from "node:assert/strict";
import { splitHkoRows, hkoCount } from "../hub-hko.helpers.ts";
test("HKO appears only inside one group, with two sources and its archive", () => {
  const rows = [
    "netatmo",
    "hko-stations",
    "hko-products",
    "hko-website",
    "open-meteo-current",
    "hres",
  ].map((id) => ({ id, health: { tone: "good" } }));
  const grouped = splitHkoRows(rows);
  assert.deepEqual(
    grouped.others.map((r) => r.id),
    ["netatmo", "open-meteo-current", "hres"],
  );
  assert.equal(grouped.stations.id, "hko-stations");
  assert.equal(grouped.products.id, "hko-products");
  assert.equal(grouped.archive.id, "hko-website");
});
test("missing source does not masquerade as healthy or copy another source timestamp", () => {
  const grouped = splitHkoRows([
    { id: "hko-stations", last_collected_at: "2026-11-01T12:00:00Z", health: { tone: "good" } },
  ]);
  assert.equal(grouped.products.health.tone, "muted");
  assert.equal(grouped.products.last_collected_at, undefined);
});
test("unknown, zero and district units remain distinct", () => {
  assert.equal(hkoCount(null), "待同步");
  assert.equal(hkoCount(0), "0 站");
  assert.equal(hkoCount(18, "行政区"), "18 行政区");
});
