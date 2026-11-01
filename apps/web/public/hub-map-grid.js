// Map inputs are centers of 0.5-degree bins, never individual station coordinates.
export function gridSize(zoom) {
  return zoom < 3 ? 8 : zoom < 4 ? 4 : zoom < 5 ? 2 : zoom < 6 ? 1 : 0.5;
}
export function aggregateCells(cells, zoom) {
  const size = gridSize(zoom);
  const bins = new Map();
  for (const [lon, lat, old, both, fresh] of cells) {
    const west = Math.floor((lon + 180) / size) * size - 180;
    const south = Math.floor((lat + 90) / size) * size - 90;
    const key = west + ":" + south;
    let bin = bins.get(key);
    if (!bin) {
      bin = {
        west,
        south,
        east: Math.min(180, west + size),
        north: Math.min(90, south + size),
        old: 0,
        both: 0,
        fresh: 0,
      };
      bins.set(key, bin);
    }
    bin.old += old;
    bin.both += both;
    bin.fresh += fresh;
  }
  return [...bins.values()];
}
export function gridText(bin) {
  return (
    "纬度 " +
    bin.south.toFixed(2) +
    "°–" +
    bin.north.toFixed(2) +
    "° / 经度 " +
    bin.west.toFixed(2) +
    "°–" +
    bin.east.toFixed(2) +
    "° · 近 24 小时 " +
    (bin.both + bin.fresh).toLocaleString() +
    " 站 · 旧集独有 " +
    bin.old.toLocaleString() +
    " · 两者都有 " +
    bin.both.toLocaleString() +
    " · 新增 " +
    bin.fresh.toLocaleString()
  );
}
