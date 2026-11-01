import { Activity } from "lucide-react";
import { Card } from "@plane/propel/card";
import { ageLabel, eventTime } from "./hub-summary.helpers";
import type { HubSnapshot } from "./hub-summary.helpers";
import { onlineRows } from "./hub-summary.helpers";

const dots = {
  good: "bg-success-primary",
  warn: "bg-warning-primary",
  bad: "bg-danger-primary",
  muted: "bg-current text-tertiary",
};
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
  const good = rows.filter((r) => r.health.tone === "good").length;
  const attention = rows.filter((r) => r.health.tone === "bad" || r.health.tone === "warn").length;
  return (
    <section id="online-collection" aria-label="在线采集">
      <Card>
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
        <p className="mb-3 text-12 text-tertiary">
          {good} 项正常{attention ? ` · ${attention} 项需关注` : ""} ·{" "}
          {rows.length - good - attention} 项待核实 · 核查{" "}
          {eventTime(snapshot?.online_collection?.checked_at ?? snapshot?.generated_at)}
        </p>
        <div
          className={`grid grid-cols-1 gap-2 ${compact ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          {rows.map((row) => (
            <div key={row.id} className="min-w-0 rounded-lg border border-subtle p-3">
              <div className="flex items-center gap-2 text-13 font-medium">
                <span
                  aria-label={row.health.label}
                  className={`h-2 w-2 shrink-0 rounded-full ${dots[row.health.tone]}`}
                />
                {row.name}
              </div>
              <p className="mt-2 text-16 font-semibold">
                <time>{eventTime(row.last_collected_at)}</time>
                <span className="ml-2 text-11 font-normal text-tertiary">{row.time_label}</span>
              </p>
              <p className="mt-1 text-11 text-tertiary">
                {row.cadence}
                {row.last_collected_at ? ` · ${ageLabel(row.last_collected_at)}` : ""}
              </p>
              {row.health.tone !== "good" && (
                <p
                  className={`mt-1 text-12 ${row.health.tone === "bad" ? "text-danger-primary" : row.health.tone === "warn" ? "text-warning-primary" : "text-tertiary"}`}
                >
                  {row.health.label} · {row.health.detail}
                </p>
              )}
              {!compact && row.health.tone === "good" && (
                <p className="mt-1 text-11 text-secondary">{row.detail}</p>
              )}
            </div>
          ))}
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
