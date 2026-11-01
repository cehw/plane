import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  CloudSun,
  Database,
  Globe2,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import useSWR from "swr";
import { HubSummaryService } from "@/services/hub-summary.service";
import {
  ageLabel,
  backupHealth,
  collectorHealth,
  latestRecords,
  snapshotIsStale,
} from "./hub-summary.helpers";
import type { HubHealth } from "./hub-summary.helpers";

const service = new HubSummaryService();
const number = (value?: number) => (value === undefined ? "—" : value.toLocaleString("zh-CN"));
const tones = {
  good: "text-success-primary",
  warn: "text-warning-primary",
  bad: "text-danger-primary",
  muted: "text-tertiary",
};

function Metric({
  icon: Icon,
  title,
  value,
  detail,
  tone = "muted",
  href,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  detail: string;
  tone?: HubHealth["tone"];
  href?: string;
}) {
  const body = (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className={`rounded-lg bg-surface-2 p-2 ${tones[tone]}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        {href && <ArrowUpRight className="text-tertiary" size={15} aria-hidden="true" />}
      </div>
      <p className="text-13 text-tertiary">{title}</p>
      <p
        className={`mt-1 text-24 leading-tight font-semibold tracking-tight ${tone === "muted" ? "text-primary" : tones[tone]}`}
      >
        {value}
      </p>
      <p className="mt-2 text-12 leading-relaxed text-secondary">{detail}</p>
    </>
  );
  const cls =
    "min-w-0 rounded-xl border border-subtle bg-surface-1 p-4 transition-colors hover:bg-surface-2";
  return href ? (
    <a href={href} className={cls}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function HubSummaryPanel({ workspaceSlug }: { workspaceSlug: string }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `hub-summary:${workspaceSlug}`,
    () => service.getSummary(workspaceSlug),
    { refreshInterval: 60000 },
  );
  if (isLoading)
    return (
      <div
        className="rounded-xl border border-subtle bg-surface-1 p-6 text-secondary"
        role="status"
      >
        正在读取工作与数据状态…
      </div>
    );
  if (!data)
    return (
      <div
        className="flex items-center justify-between rounded-xl border border-subtle p-5"
        role="alert"
      >
        <p className="text-secondary">首页摘要暂时无法读取，请稍后重试。</p>
        <button type="button" className="text-accent-primary" onClick={() => void mutate()}>
          重试
        </button>
      </div>
    );
  const snapshot = data.snapshot;
  const netatmo = snapshot?.netatmo;
  const collector = collectorHealth(snapshot);
  const backup = backupHealth(snapshot);
  const stale = snapshotIsStale(snapshot);
  const root = data.workdesk_url?.replace(/\/$/, "");
  const dataUrl = root ? `${root}/data` : undefined;
  const records = latestRecords(data.work_records);
  const alerts = [
    ...(error ? ["最新刷新失败，下面保留上次读到的状态。"] : []),
    ...(data.snapshot_error ? [data.snapshot_error] : []),
    ...(snapshot && stale ? ["Climet3 状态超过 90 分钟未同步，卡片中的数字是最后一次记录。"] : []),
    ...(collector.tone === "bad" || (!stale && collector.label === "观测延迟")
      ? [collector.detail]
      : []),
    ...(backup.tone === "bad" || (!stale && backup.label === "备份延迟")
      ? [`${backup.label} · ${backup.detail}`]
      : []),
  ];
  return (
    <section className="space-y-5" aria-label="工作与数据概览">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-12 font-medium tracking-widest text-tertiary">HAN WORK HUB</p>
          <h2 className="text-20 font-semibold text-primary">工作与数据概览</h2>
          <p className="mt-1 text-12 text-tertiary">
            原始数据与计算在 Climet3 · 关键观测保存在 NAS
          </p>
        </div>
        <button
          type="button"
          onClick={() => void mutate()}
          disabled={isValidating}
          className="flex items-center gap-2 text-12 text-secondary"
          aria-label="刷新概览"
        >
          <RefreshCw size={14} className={isValidating ? "animate-spin" : ""} aria-hidden="true" />
          {snapshot ? `源状态 ${ageLabel(snapshot.generated_at)}` : "等待首次同步"}
        </button>
      </div>
      {alerts.length > 0 && (
        <div
          className="rounded-lg border border-warning-subtle bg-surface-2 p-3 text-12 text-warning-primary"
          role="status"
        >
          {alerts.map((message) => (
            <p key={message} className="flex items-start gap-2 py-0.5">
              <CircleAlert className="mt-0.5 shrink-0" size={14} aria-hidden="true" />
              {message}
            </p>
          ))}
        </div>
      )}
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        data-testid="hub-metrics"
      >
        <Metric
          icon={CloudSun}
          title="Netatmo · 近 24 小时站点"
          value={number(netatmo?.recent_stations)}
          detail={
            netatmo ? `相对旧参考集新增 ${number(netatmo.new_since_reference)} 站` : "等待观测统计"
          }
          href={dataUrl}
          tone={stale ? "muted" : "good"}
        />
        <Metric
          icon={Globe2}
          title="全球观测范围"
          value={netatmo ? `${number(netatmo.recent_countries)} 个国家 / 地区` : "—"}
          detail={
            netatmo?.collector.global_scan_complete
              ? "首轮扫描已完成 · 全球总站数未知"
              : "首轮扫描中 · 全球总站数未知"
          }
          href={dataUrl}
        />
        <Metric
          icon={Activity}
          title="Climet3 · 采集状态"
          value={collector.label}
          detail={collector.detail}
          tone={collector.tone}
          href={dataUrl}
        />
        <Metric
          icon={ShieldCheck}
          title="NAS · 关键数据备份"
          value={backup.label}
          detail={backup.detail}
          tone={backup.tone}
          href={dataUrl}
        />
        <Metric
          icon={Database}
          title="历史原始观测"
          value={netatmo ? `${(netatmo.archive.bytes / 1e9).toFixed(2)} GB` : "—"}
          detail={
            netatmo
              ? `${number(netatmo.archive.csv_files)} 个 CSV · 另有持续新增观测`
              : "等待归档统计"
          }
          href={dataUrl}
        />
        <Metric
          icon={ClipboardList}
          title="Plane · 当前未完成任务"
          value={number(data.plane.open)}
          detail={`${data.plane.in_progress} 项进行中 · ${data.plane.overdue} 项逾期 · 不含历史工作日志`}
          href={`/${workspaceSlug}/projects/`}
          tone={data.plane.overdue ? "warn" : "muted"}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 rounded-xl border border-subtle bg-surface-1 p-4 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-14 font-semibold text-primary">
              <ClipboardList size={16} aria-hidden="true" />
              最近工作进展
            </h3>
            {root && (
              <a href={root} className="shrink-0 text-12 text-accent-primary">
                全部记录 ↗
              </a>
            )}
          </div>
          {records.length ? (
            <ul className="divide-y divide-subtle">
              {records.map((record) => (
                <li key={record.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="mb-1 flex flex-wrap gap-x-2 gap-y-1 text-11 text-tertiary">
                    <span>{record.project}</span>
                    <span>·</span>
                    <time>{record.end}</time>
                    <span className="rounded bg-surface-2 px-1.5 text-secondary">
                      {record.kind}
                    </span>
                  </div>
                  <p className="text-13 leading-relaxed text-primary">{record.title}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-5 text-13 text-tertiary">工作历史尚未同步；这里不会自动生成待办。</p>
          )}
          <p className="mt-3 text-11 text-tertiary">
            历史记录来自工作时间轴 · 同步于 {ageLabel(data.work_records_updated_at)}
          </p>
        </div>
        <div className="min-w-0 space-y-4 rounded-xl border border-subtle bg-surface-1 p-4 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-14 font-semibold text-primary">
            <Server size={16} aria-hidden="true" />
            数据运行摘要
          </h3>
          <div>
            <p className="text-12 text-tertiary">全球查询网格</p>
            <p className="mt-1 text-13 text-secondary">
              {netatmo
                ? `${number(netatmo.tiles.successful)} 已成功 · ${number(netatmo.tiles.failed)} 待重试 · ${number(netatmo.tiles.pending)} 待扫描`
                : "尚无扫描状态"}
            </p>
          </div>
          <div className="flex items-start gap-2 border-t border-subtle pt-3">
            <HardDrive size={16} className="mt-0.5 shrink-0 text-tertiary" aria-hidden="true" />
            <p className="text-12 leading-relaxed text-secondary">
              Netatmo 高优先级保留；HRES 可重新下载，优先保留脚本与配置。
            </p>
          </div>
          {netatmo?.archive.known_gap && (
            <div className="border-t border-subtle pt-3">
              <p className="mb-1 text-12 font-medium text-warning-primary">
                已知历史缺口
              </p>
              <p className="text-12 leading-relaxed text-secondary">{netatmo.archive.known_gap}</p>
            </div>
          )}
          <p className="flex items-start gap-2 text-11 leading-relaxed text-tertiary">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            页面每分钟读取已同步状态；源数据按小时同步，更新时间始终可见。
          </p>
        </div>
      </div>
    </section>
  );
}
