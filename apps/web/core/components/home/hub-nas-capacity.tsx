import { capacityPercent, capacityIsStale, eventTime } from "./hub-summary.helpers";
import type { NasShare, NasVolume } from "./hub-summary.helpers";

export function NasCapacity({ share, compact = false }: { share?: NasShare; compact?: boolean }) {
  const percent = capacityPercent(share?.used, share?.total);
  const stale = capacityIsStale(share?.observed_at);
  const color = stale
    ? "text-tertiary"
    : percent !== null && percent >= 90
      ? "text-danger-primary"
      : percent !== null && percent >= 80
        ? "text-warning-primary"
        : "text-accent-primary";
  if (compact)
    return (
      <div className="mt-3 border-t border-subtle pt-3" aria-label="NAS 共享配额">
        <p className="text-11 text-secondary">
          {percent !== null && share
            ? `${share.used.toFixed(3)} / ${share.total.toFixed(2)} ${share.unit}`
            : "配额待核对"}
        </p>
        <div
          className={`mt-2 h-1.5 rounded-full bg-surface-3 ${color}`}
          role="progressbar"
          aria-label="NAS 共享占用"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent === null ? undefined : Math.min(percent, 100)}
        >
          <div
            className="h-full rounded-full bg-current"
            style={{ width: `${percent === null ? 0 : Math.min(percent, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-11 text-tertiary">
          {percent === null ? "尚无读数" : `已用 ${percent.toFixed(1)}%`} · {share?.name ?? "共享"}
        </p>
        <p className={`mt-1 text-11 ${stale ? "text-warning-primary" : "text-tertiary"}`}>
          DSM {eventTime(share?.observed_at)}
          {stale && share ? " · 待核对" : ""}
        </p>
      </div>
    );
  return (
    <div className="mt-3 border-t border-subtle pt-3" aria-label="NAS 共享配额">
      <p className="mb-2 text-12 font-medium text-secondary">{share?.name ?? "NAS"} · 共享配额</p>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="relative h-16 w-16 shrink-0"
          role="img"
          aria-label={percent === null ? "容量等待核对" : `共享已用 ${percent.toFixed(1)}%`}
        >
          <svg
            viewBox="0 0 100 100"
            className={`h-full w-full -rotate-90 ${color}`}
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="9"
              className="text-tertiary opacity-20"
            />
            {percent !== null && (
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="9"
                pathLength="100"
                strokeDasharray={`${Math.min(percent, 100)} 100`}
                strokeLinecap="round"
              />
            )}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-12 font-semibold text-primary">
            {percent === null ? "—" : `${percent.toFixed(1)}%`}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-13 font-medium text-primary">
            {percent !== null && share
              ? `${share.used.toFixed(3)} / ${share.total.toFixed(2)} ${share.unit}`
              : "已用 / 总额待核对"}
          </p>
          <p className="mt-1 text-11 text-tertiary">
            {percent !== null && share
              ? `剩余约 ${Math.max(0, share.total - share.used).toFixed(3)} ${share.unit}`
              : "尚无 DSM 配额读数"}
          </p>
        </div>
      </div>
      <p className={`mt-2 text-11 ${stale ? "text-warning-primary" : "text-tertiary"}`}>
        DSM 核对 {eventTime(share?.observed_at)}
        {stale && share ? " · 需重新核对" : ""}
      </p>
    </div>
  );
}

export function NasVolumeCapacity({ volume }: { volume?: NasVolume }) {
  const percent = capacityPercent(volume?.used_bytes, volume?.total_bytes);
  const stale = Boolean(volume?.error) || capacityIsStale(volume?.observed_at, 90);
  return (
    <div className="mt-3 border-t border-subtle pt-3">
      <p className="text-12 font-medium">NAS 卷整体容量 · {volume?.name ?? "Volume 1"}</p>
      {percent !== null && volume?.used_bytes !== undefined && volume.total_bytes !== undefined ? (
        <>
          <p className="mt-2 text-12 text-secondary">
            已用 {(volume.used_bytes / 2 ** 40).toFixed(2)} /{" "}
            {(volume.total_bytes / 2 ** 40).toFixed(2)} TiB · {percent.toFixed(1)}%
          </p>
          <div
            role="progressbar"
            aria-label="NAS 卷整体占用"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(percent, 100)}
            className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3"
          >
            <div
              className={`h-full ${stale ? "bg-accent-primary opacity-40" : "bg-accent-primary"}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-11 text-tertiary">
            卷空闲{" "}
            {volume.free_bytes === undefined
              ? "未知"
              : `${(volume.free_bytes / 2 ** 40).toFixed(2)} TiB`}
            ，不等于此共享可写额度。
          </p>
        </>
      ) : (
        <p className="mt-2 text-12 text-tertiary">卷容量等待同步。</p>
      )}
      <p className={`mt-2 text-11 ${stale ? "text-warning-primary" : "text-tertiary"}`}>
        {volume?.error ?? (stale ? "卷读数待更新" : "卷容量更新")} ·{" "}
        {eventTime(volume?.observed_at)}
      </p>
    </div>
  );
}
