import { useEffect, useRef, useState } from "react";
import "./hub-data-map.css";
export type StationMap = {
  generated_at: string;
  points: [number, number, number, number | null][];
};
type MapController = { update: (data: StationMap) => void; destroy: () => void };
type MapModule = {
  renderMap: (
    root: HTMLDivElement,
    data: StationMap,
    select: (text: string) => void,
  ) => Promise<MapController>;
};
export function HubDataMap({ data }: { data: StationMap }) {
  const ref = useRef<HTMLDivElement>(null);
  const controller = useRef<MapController | undefined>(undefined);
  const latestData = useRef(data);
  const [detail, setDetail] = useState("滚轮缩放或点击聚类，展开真实站点位置");
  const [error, setError] = useState("");
  useEffect(() => {
    latestData.current = data;
    controller.current?.update(data);
  }, [data]);
  useEffect(() => {
    let active = true;
    const moduleUrl = "/hub-data-map.js?v=5";
    void (async () => {
      try {
        const module = (await import(/* @vite-ignore */ moduleUrl)) as MapModule;
        if (!active || !ref.current) return;
        const map = await module.renderMap(ref.current, latestData.current, (text) => {
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
        <span>● 灰：旧参考集独有（可选）</span>
        <span>● 蓝：两者都有</span>
        <span>● 绿：相对旧参考集新增</span>
      </div>
      <div ref={ref} className="min-h-[340px] w-full" aria-label="Netatmo 全球站点覆盖地图" />
      <p className="mt-3 text-12 text-tertiary" aria-live="polite">
        {error || detail}
      </p>
    </div>
  );
}
