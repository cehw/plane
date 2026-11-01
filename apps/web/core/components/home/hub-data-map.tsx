import { useEffect, useRef, useState } from "react";
import "./hub-data-map.css";
export type MapCell = [number, number, number, number, number];
type MapController = { update: (cells: MapCell[]) => void; destroy: () => void };
type MapModule = {
  renderMap: (
    root: HTMLDivElement,
    cells: MapCell[],
    select: (text: string) => void,
  ) => Promise<MapController>;
};
export function HubDataMap({ cells }: { cells: MapCell[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const controller = useRef<MapController | undefined>(undefined);
  const latestCells = useRef(cells);
  const [detail, setDetail] = useState("拖动、缩放或点选格网查看站点构成");
  const [error, setError] = useState("");
  useEffect(() => {
    latestCells.current = cells;
    controller.current?.update(cells);
  }, [cells]);
  useEffect(() => {
    let active = true;
    const moduleUrl = "/hub-data-map.js?v=2";
    void (async () => {
      try {
        const module = (await import(/* @vite-ignore */ moduleUrl)) as MapModule;
        if (!active || !ref.current) return;
        const map = await module.renderMap(ref.current, latestCells.current, (text) => {
          if (active) setDetail(text);
        });
        if (!active) map.destroy();
        else {
          controller.current = map;
          setError("");
        }
      } catch {
        if (active) setError("地图底图暂时未加载，站点统计和表格仍可使用。");
      }
    })();
    return () => {
      active = false;
      controller.current?.destroy();
      controller.current = undefined;
    };
  }, []);
  return (
    <div className="hub-data-map">
      <link rel="stylesheet" href="/vendor/leaflet/leaflet.css" />
      <div className="mb-3 flex flex-wrap gap-4 text-12 text-tertiary">
        <span>● 灰：旧参考集独有</span>
        <span>● 蓝：两者都有</span>
        <span>● 绿：含近 24 小时新增</span>
      </div>
      <div ref={ref} className="min-h-[340px] w-full" aria-label="Netatmo 全球站点覆盖地图" />
      <p className="mt-3 text-12 text-tertiary" aria-live="polite">
        {error || detail}
      </p>
    </div>
  );
}
