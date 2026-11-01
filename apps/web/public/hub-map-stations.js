import Supercluster from "./vendor/supercluster/index.js";

export const MAP_OPTIONS = { minZoom: 0, maxZoom: 19, scrollWheelZoom: true };
export const CATEGORY_COLORS = ["#64748b", "#2563eb", "#059669"];

export function stationFeatures(points, includeLegacy = false) {
  return points
    .filter((p) => includeLegacy || p[2] !== 0)
    .map(([lon, lat, category, seen]) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: {
        category,
        seen,
        old: +(category === 0),
        both: +(category === 1),
        fresh: +(category === 2),
      },
    }));
}

export function stationIndex(points, includeLegacy = false) {
  return new Supercluster({
    radius: 100,
    maxZoom: 19,
    minPoints: 2,
    map: (p) => ({ old: p.old, both: p.both, fresh: p.fresh }),
    reduce: (a, p) => {
      a.old += p.old;
      a.both += p.both;
      a.fresh += p.fresh;
    },
  }).load(stationFeatures(points, includeLegacy));
}

export function clusterText(p) {
  return `${(p.point_count ?? 1).toLocaleString()} 个站点 · 旧参考独有 ${p.old.toLocaleString()} · 两者共有 ${p.both.toLocaleString()} · 相对参考新增 ${p.fresh.toLocaleString()}`;
}

export function ringGradient(p) {
  const total = p.old + p.both + p.fresh;
  const a = (p.old / total) * 100,
    b = ((p.old + p.both) / total) * 100;
  return `conic-gradient(${CATEGORY_COLORS[0]} 0% ${a}%,${CATEGORY_COLORS[1]} ${a}% ${b}%,${CATEGORY_COLORS[2]} ${b}% 100%)`;
}
