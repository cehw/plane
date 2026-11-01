import * as L from "./vendor/leaflet/leaflet.esm.js";
import {
  MAP_OPTIONS,
  CATEGORY_COLORS,
  stationIndex,
  clusterText,
  ringGradient,
} from "./hub-map-stations.js";

export async function renderMap(root, data, select) {
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
    ...MAP_OPTIONS,
    center: [22, 10],
    zoom: 2,
    maxBounds: [
      [-85, -180],
      [85, 180],
    ],
    maxBoundsViscosity: 1,
    preferCanvas: true,
    zoomAnimation: false,
  });
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    noWrap: true,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.fitWorld({ padding: [12, 12], maxZoom: 2 });
  let tileFailed = false;
  tiles.on("tileerror", () => {
    tileFailed = true;
    updateStatus();
  });
  tiles.on("loading", () => {
    tileFailed = false;
  });
  tiles.on("load", updateStatus);
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let includeLegacy = false;
  let index = stationIndex(data.points, includeLegacy);
  let represented = 0,
    clusters = 0,
    singles = 0;

  function updateStatus() {
    const time = new Date(data.generated_at).toLocaleString(undefined, { hour12: false });
    status.textContent =
      `缩放 ${map.getZoom()} · 当前聚类代表 ${represented.toLocaleString()} 个站点 · ${clusters} 个聚类 / ${singles} 个单站 · 数据时间 ${time}` +
      (tileFailed ? " · 部分底图未加载；站点仍可查看" : "");
  }
  function draw() {
    layer.clearLayers();
    const b = map.getBounds();
    const zoom = map.getZoom();
    const features = index.getClusters(
      [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      zoom,
    );
    represented = 0;
    clusters = 0;
    singles = 0;
    for (const feature of features) {
      const p = feature.properties,
        [lon, lat] = feature.geometry.coordinates;
      const clustered = Boolean(p.cluster);
      represented += p.point_count ?? 1;
      if (clustered) clusters++;
      else singles++;
      let marker;
      if (clustered) {
        const content = document.createElement("div");
        content.className = "hub-station-ring";
        content.style.background = ringGradient(p);
        const count = document.createElement("span");
        count.textContent = p.point_count.toLocaleString();
        content.append(count);
        marker = L.marker([lat, lon], {
          icon: L.divIcon({
            html: content,
            className: "hub-station-cluster",
            iconSize: [44, 44],
            iconAnchor: [22, 22],
          }),
          title: clusterText(p) + "；点击展开",
          keyboard: true,
        });
      } else {
        marker = L.circleMarker([lat, lon], {
          radius: 6,
          weight: 1.5,
          color: "#fff",
          fillColor: CATEGORY_COLORS[p.category],
          fillOpacity: 0.9,
        });
      }
      const details = document.createElement("div");
      if (clustered) {
        details.textContent =
          clusterText(p) +
          (zoom >= MAP_OPTIONS.maxZoom
            ? " · 此尺度仍有重合位置；未人为移动站点"
            : " · 点击继续展开");
      } else {
        const time = p.seen
          ? new Date(p.seen * 1000).toLocaleString(undefined, { hour12: false })
          : "仅旧参考集，不能认定当前在线";
        details.textContent = `${clusterText(p)} · 源站位置 ${lat.toFixed(5)}, ${lon.toFixed(5)} · 最近观测 ${time}`;
      }
      if (clustered)
        marker.bindTooltip(details, { direction: "top", className: "hub-map-tooltip" });
      marker.on("popupopen", () => marker.closeTooltip());
      marker.on("click", () => {
        select(details.textContent);
        if (clustered && zoom < MAP_OPTIONS.maxZoom) {
          map.setView(
            [lat, lon],
            Math.min(MAP_OPTIONS.maxZoom, index.getClusterExpansionZoom(p.cluster_id)),
          );
        } else {
          marker.closeTooltip();
          // Keep the popup independent of marker redraws during its automatic pan.
          L.popup({
            minWidth: 100,
            maxWidth: Math.max(100, Math.min(360, frame.clientWidth - 80)),
            autoPanPadding: [12, 12],
          })
            .setLatLng([lat, lon])
            .setContent(details.cloneNode(true))
            .openOn(map);
        }
      });
      layer.addLayer(marker);
    }
    updateStatus();
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
    button.addEventListener("click", () =>
      label === "全球"
        ? map.fitWorld({ padding: [12, 12], maxZoom: 2 })
        : map.setView(center, zoom),
    );
    toolbar.append(button);
  }
  const legacy = document.createElement("button");
  legacy.type = "button";
  legacy.textContent = "包括旧参考站点";
  legacy.setAttribute("aria-pressed", "false");
  legacy.addEventListener("click", () => {
    includeLegacy = !includeLegacy;
    legacy.setAttribute("aria-pressed", String(includeLegacy));
    index = stationIndex(data.points, includeLegacy);
    draw();
    select(
      includeLegacy ? "已加入旧参考站点；灰色不表示当前在线。" : "仅显示最近 24 小时有观测的站点。",
    );
  });
  toolbar.append(legacy);
  map.on("moveend", draw);
  const resize = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  resize.observe(frame);
  draw();
  select(
    "滚轮缩放 · 点击聚类展开 · 放大查看源站位置；默认最近 24 小时，圆环表示站点构成，不代表气象数值。",
  );
  return {
    update(nextData) {
      if (nextData.generated_at === data.generated_at) return;
      data = nextData;
      index = stationIndex(data.points, includeLegacy);
      draw();
    },
    destroy() {
      resize.disconnect();
      map.remove();
      root.replaceChildren();
    },
  };
}
