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
  dense = false,
}: {
  row: CollectorRow;
  title?: string;
  compact?: boolean;
  dense?: boolean;
}) {
  if (dense)
    return (
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-13 font-medium">
          <span
            aria-label={row.health.label}
            className={`h-2 w-2 shrink-0 rounded-full ${dots[row.health.tone]}`}
          />
          <span>{title ?? row.name}</span>
        </div>
        <time title={row.time_label} className="whitespace-nowrap text-13 font-medium tabular-nums">
          {eventTime(row.last_collected_at)}
        </time>
        <p className="pl-4 text-11 text-tertiary">
          {row.cadence}
          {!compact && row.health.tone === "good" && row.detail ? ` · ${row.detail}` : ""}
        </p>
        <p className="text-right text-11 text-tertiary">
          {row.last_collected_at ? ageLabel(row.last_collected_at) : row.health.label}
        </p>
        {row.health.tone !== "good" && (
          <p
            className={`col-span-2 pl-4 text-12 ${row.health.tone === "bad" ? "text-danger-primary" : "text-secondary"}`}
          >
            {row.health.label} · {row.health.detail}
          </p>
        )}
      </div>
    );
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
