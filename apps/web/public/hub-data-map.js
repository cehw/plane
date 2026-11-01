import * as L from "./vendor/leaflet/leaflet.esm.js";
import { aggregateCells, gridSize, gridText } from "./hub-map-grid.js";

export async function renderMap(root, cells, select) {
  root.replaceChildren();
  const toolbar = document.createElement("div");
  toolbar.className = "hub-map-toolbar";
  const frame = document.createElement("div");
  frame.className = "hub-map-frame";
  frame.setAttribute("aria-label", "可缩放的 Netatmo 覆盖地图");
  const status = document.createElement("div");
  status.className = "hub-map-status";
  status.setAttribute("role", "status");
  root.append(toolbar, frame, status);

  const map = L.map(frame, {
    center: [22, 10],
    zoom: 2,
    minZoom: 2,
    maxZoom: 16,
    maxBounds: [
      [-85, -180],
      [85, 180],
    ],
    maxBoundsViscosity: 1,
    preferCanvas: true,
    scrollWheelZoom: false,
    zoomAnimation: false,
  });
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    noWrap: true,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  }).addTo(map);
  let tileFailed = false;
  tiles.on("tileerror", () => {
    tileFailed = true;
    status.textContent = "部分底图未加载，请检查网络；覆盖格网仍可查看。";
  });
  tiles.on("loading", () => {
    tileFailed = false;
  });
  tiles.on("load", () => {
    if (!tileFailed) updateStatus();
  });
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let visible = 0;

  function updateStatus() {
    const zoom = map.getZoom(),
      size = gridSize(zoom);
    status.textContent =
      "缩放 " +
      zoom +
      " · 当前视野 " +
      visible +
      " 个覆盖区域 · " +
      size +
      "° 汇总" +
      (zoom >= 7 ? " · 已到数据最高精度；继续放大仅增加底图细节" : " · 放大可展开覆盖区域");
  }
  function draw() {
    layer.clearLayers();
    const zoom = map.getZoom(),
      bounds = map.getBounds();
    const bins = aggregateCells(cells, zoom);
    visible = 0;
    for (const bin of bins) {
      const box = L.latLngBounds([
        [bin.south, bin.west],
        [bin.north, bin.east],
      ]);
      if (!bounds.intersects(box)) continue;
      visible++;
      const color = bin.fresh > 0 ? "#059669" : bin.both > 0 ? "#2563eb" : "#64748b";
      const count = bin.old + bin.both + bin.fresh;
      const marker =
        zoom >= 7
          ? L.rectangle(box, { color, weight: 1.5, fillColor: color, fillOpacity: 0.16 })
          : L.circleMarker(box.getCenter(), {
              radius: Math.min(17, 3 + Math.log2(1 + count) * 0.9),
              color: "#ffffff",
              weight: 1,
              fillColor: color,
              fillOpacity: 0.82,
            });
      const text = gridText(bin);
      marker.bindTooltip(text, { direction: "top", className: "hub-map-tooltip" });
      marker.on("popupopen", () => marker.closeTooltip());
      marker.on("click", () => {
        select(text + (zoom < 7 ? " · 已展开此区域" : " · 0.5° 汇总，不是单站位置"));
        if (zoom < 7) map.setView(box.getCenter(), Math.min(7, zoom + 2));
        else marker.bindPopup(text).openPopup();
      });
      layer.addLayer(marker);
    }
    if (!tileFailed) updateStatus();
  }
  for (const [label, center, zoom] of [
    ["全球", [22, 10], 2],
    ["欧洲", [49, 10], 5],
    ["东亚", [27, 117], 5],
    ["北美", [39, -98], 4],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => map.setView(center, zoom));
    toolbar.append(button);
  }
  const wheel = document.createElement("button");
  wheel.type = "button";
  wheel.textContent = "滚轮缩放";
  wheel.setAttribute("aria-pressed", "false");
  wheel.addEventListener("click", () => {
    const enabled = !map.scrollWheelZoom.enabled();
    if (enabled) map.scrollWheelZoom.enable();
    else map.scrollWheelZoom.disable();
    wheel.setAttribute("aria-pressed", String(enabled));
  });
  toolbar.append(wheel);
  map.on("moveend", draw);
  const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  resize.observe(frame);
  draw();
  select("点击覆盖区域查看数量；可用 + / −、双击或触屏缩放。底图随缩放加载，数据精度为 0.5°。");
  return {
    update(nextCells) {
      cells = nextCells;
      draw();
    },
    destroy() {
      resize.disconnect();
      map.remove();
      root.replaceChildren();
    },
  };
}
