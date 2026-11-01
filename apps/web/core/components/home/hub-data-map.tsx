import { useEffect, useRef, useState } from "react";
import "./hub-data-map.css";
export type MapCell = [number, number, number, number, number];
type MapModule = {
  renderMap: (
    root: HTMLDivElement,
    cells: MapCell[],
    select: (text: string) => void,
  ) => Promise<() => void>;
};
export function HubDataMap({ cells }: { cells: MapCell[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState("拖动、缩放或点选格网查看站点构成");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let cleanup: (() => void) | undefined;
    const moduleUrl = "/hub-data-map.js";
    void (async () => {
      try {
        const module = (await import(/* @vite-ignore */ moduleUrl)) as MapModule;
        if (active && ref.current)
          cleanup = await module.renderMap(ref.current, cells, (text) => {
            if (active) setDetail(text);
          });
        if (!active) cleanup?.();
      } catch {
        if (active) setError("地图底图暂时未加载，站点统计和表格仍可使用。");
      }
    })();
    return () => {
      active = false;
      cleanup?.();
    };
  }, [cells]);
  return (
    <div className="hub-data-map">
      <div className="mb-3 flex flex-wrap gap-4 text-12 text-tertiary">
        <span>● 灰：旧参考集独有</span>
        <span>● 蓝：两者都有</span>
        <span>■ 绿：近 24 小时新增</span>
      </div>
      <div
        ref={ref}
        className="min-h-[230px] w-full touch-none"
        aria-label="Netatmo 全球站点覆盖地图"
      />
      <p className="mt-3 text-12 text-tertiary" aria-live="polite">
        {error || detail}
      </p>
    </div>
  );
}
