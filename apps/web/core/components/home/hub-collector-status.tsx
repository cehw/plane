import { ageLabel, eventTime } from "./hub-summary.helpers";
import type { CollectorRow } from "./hub-hko.helpers";
const dots = {
  good: "bg-success-primary",
  warn: "bg-warning-primary",
  bad: "bg-danger-primary",
  muted: "bg-current text-tertiary",
};
export function HubCollectorStatus({
  row,
  title,
  compact = false,
}: {
  row: CollectorRow;
  title?: string;
  compact?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2 text-13 font-medium">
        <span
          aria-label={row.health.label}
          className={`h-2 w-2 shrink-0 rounded-full ${dots[row.health.tone]}`}
        />
        {title ?? row.name}
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
    </>
  );
}
