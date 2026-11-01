import { Activity } from "lucide-react";
import { Card } from "@plane/propel/card";
import { eventTime } from "./hub-summary.helpers";
import type { HubSnapshot } from "./hub-summary.helpers";
import { onlineRows } from "./hub-summary.helpers";

import { HubCollectorStatus } from "./hub-collector-status";
import { HubHkoCollection } from "./hub-hko-collection";
import { splitHkoRows } from "./hub-hko.helpers";
export function HubOnlineCollection({
  snapshot,
  href,
  compact = false,
}: {
  snapshot: HubSnapshot | null;
  href?: string;
  compact?: boolean;
}) {
  const rows = onlineRows(snapshot);
  const grouped = splitHkoRows(rows);
  const good = rows.filter((r) => r.health.tone === "good").length;
  const attention = rows.filter((r) => r.health.tone === "bad" || r.health.tone === "warn").length;
  return (
    <section id="online-collection" aria-label="在线采集">
      <Card className="gap-0 p-4 shadow-none">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-16 font-semibold">
            <Activity size={18} aria-hidden="true" />
            在线采集
          </h3>
          {href && (
            <a href={href} className="text-12 text-accent-primary">
              采集详情 ↗
            </a>
          )}
        </div>
        <p className="mb-2 text-11 text-tertiary">
          采集任务：{good} 项正常{attention ? ` · ${attention} 项需关注` : ""} ·{" "}
          {rows.length - good - attention} 项待核实 · 核查{" "}
          {eventTime(snapshot?.online_collection?.checked_at ?? snapshot?.generated_at)}
        </p>
        <div className="divide-y divide-subtle">
          {grouped.others
            .filter((row) => row.id === "netatmo")
            .map((row) => (
              <HubCollectorStatus key={row.id} row={row} compact={compact} dense />
            ))}
          <HubHkoCollection
            rows={grouped}
            coverage={snapshot?.online_collection?.hko}
            compact={compact}
          />
          {compact ? (
            <details className="py-3 text-12">
              <summary className="cursor-pointer text-secondary">
                其他采集 · {grouped.others.filter((row) => row.id !== "netatmo").length} 项 ·
                Open-Meteo / HRES
              </summary>
              <div className="mt-2 divide-y divide-subtle">
                {grouped.others
                  .filter((row) => row.id !== "netatmo")
                  .map((row) => (
                    <HubCollectorStatus key={row.id} row={row} compact dense />
                  ))}
              </div>
            </details>
          ) : (
            <>
              {" "}
              {grouped.others
                .filter((row) => row.id !== "netatmo")
                .map((row) => (
                  <HubCollectorStatus key={row.id} row={row} compact={compact} dense />
                ))}
            </>
          )}
        </div>
        {!compact && (
          <p className="mt-3 text-11 text-tertiary">
            状态以最近核查时刻为准，按各自采集周期判断；预报时间不作为抓取时间。摘要约每小时同步，网页刷新不触发采集。
          </p>
        )}
      </Card>
    </section>
  );
}
