import test from "node:test";
import assert from "node:assert/strict";
import { aggregateCells, gridSize, gridText } from "../../../../public/hub-map-grid.js";
const cells = [
  [10.25, 45.25, 2, 3, 4],
  [10.75, 45.75, 1, 2, 5],
  [-0.25, -0.25, 6, 7, 8],
];
test("zoom progressively splits coverage without inventing finer source data", () => {
  assert.deepEqual([2, 3, 4, 5, 6, 16].map(gridSize), [8, 4, 2, 1, 0.5, 0.5]);
  assert.equal(aggregateCells(cells, 2).length, 2);
  assert.equal(aggregateCells(cells, 6).length, 3);
  assert.deepEqual(aggregateCells(cells, 6), aggregateCells(cells, 16));
});
test("all zoom levels preserve each category count", () => {
  for (let zoom = 2; zoom <= 16; zoom++) {
    const sum = aggregateCells(cells, zoom).reduce(
      (a, b) => [a[0] + b.old, a[1] + b.both, a[2] + b.fresh],
      [0, 0, 0],
    );
    assert.deepEqual(sum, [9, 12, 17]);
  }
});
test("negative and antimeridian bins have geographic bounds, not point locations", () => {
  const [negative, edge] = aggregateCells(
    [
      [-0.25, -0.25, 1, 0, 0],
      [179.75, 89.75, 0, 1, 0],
    ],
    6,
  );
  assert.deepEqual(
    [negative.west, negative.south, negative.east, negative.north],
    [-0.5, -0.5, 0, 0],
  );
  assert.deepEqual([edge.east, edge.north], [180, 90]);
  assert.match(gridText(negative), /旧集独有 1/);
  assert.deepEqual(aggregateCells([], 3), []);
});
