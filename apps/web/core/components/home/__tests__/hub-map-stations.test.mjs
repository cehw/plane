import test from "node:test";
import assert from "node:assert/strict";
import { MAP_OPTIONS, stationFeatures, stationIndex } from "../../../../public/hub-map-stations.js";
const points = [
  [114.123456, 22.123456, 1, 123],
  [114.123456, 22.123456, 2, 124],
  [114.13, 22.13, 0, null],
  [-73.987, 40.754, 2, 125],
];
test("uses original coordinates and observation time, omits legacy by default", () => {
  const f = stationFeatures(points);
  assert.equal(f.length, 3);
  assert.deepEqual(f[0].geometry.coordinates, points[0].slice(0, 2));
  assert.equal(f[0].properties.seen, 123);
});
test("clusters conserve counts and category composition at every supported zoom", () => {
  for (const includeLegacy of [false, true]) {
    const index = stationIndex(points, includeLegacy);
    for (let zoom = MAP_OPTIONS.minZoom; zoom <= MAP_OPTIONS.maxZoom; zoom++) {
      const fs = index.getClusters([-180, -85, 180, 85], zoom);
      const sums = fs.reduce(
        (a, f) => a.map((v, i) => v + f.properties[["old", "both", "fresh"][i]]),
        [0, 0, 0],
      );
      assert.deepEqual(sums, [includeLegacy ? 1 : 0, 1, 2]);
    }
  }
});
test("co-located stations remain a countable cluster rather than losing or moving points", () => {
  const fs = stationIndex(points).getClusters([114, 22, 115, 23], 19);
  assert.equal(fs.length, 1);
  assert.equal(fs[0].properties.point_count, 2);
});
test("wheel zoom is on by default", () => assert.equal(MAP_OPTIONS.scrollWheelZoom, true));
