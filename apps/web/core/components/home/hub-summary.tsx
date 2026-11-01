import { Activity, ArrowUpRight, CircleAlert, ClipboardList, RefreshCw, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import useSWR from "swr";
import { HubSummaryService } from "@/services/hub-summary.service";
import { ageLabel, backupHealth, collectorHealth, latestRecords, snapshotIsStale } from "./hub-summary.helpers";
import type { HubHealth } from "./hub-summary.helpers";

import { HubPortfolio } from "./hub-portfolio";
import { eventTime } from "./hub-summary.helpers";
import { HubTasks } from "./hub-tasks";

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
  indicator = false,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  detail: string;
  tone?: HubHealth["tone"];
  href?: string;
  indicator?: boolean;
}) {
  const body = (
    <>
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className={`rounded-lg bg-surface-2 p-2 ${tones[tone]}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
        {href && <ArrowUpRight className="text-tertiary" size={15} aria-hidden="true" />}
      </div>
      <p className="flex items-center gap-2 text-13 text-tertiary">
        {indicator && (
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${tone === "good" ? "bg-success-primary" : tone === "bad" ? "bg-danger-primary" : "bg-warning-primary"}`}
            aria-label={tone === "good" ? "正常" : "需要关注"}
          />
        )}
        {title}
      </p>
      <p
        className={`mt-1 text-24 leading-tight font-semibold tracking-tight ${tone === "muted" ? "text-primary" : tones[tone]}`}
      >
        {value}
      </p>
      <p className="mt-2 text-12 leading-relaxed text-secondary">{detail}</p>
    </>
  );
  const cls = "min-w-0 rounded-xl border border-subtle bg-surface-1 p-4 transition-colors hover:bg-surface-2";
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
    { refreshInterval: 60000 }
  );
  if (isLoading)
    return (
      <div className="rounded-xl border border-subtle bg-surface-1 p-6 text-secondary" role="status">
        正在读取工作与数据状态…
      </div>
    );
  if (!data)
    return (
      <div className="flex items-center justify-between rounded-xl border border-subtle p-5" role="alert">
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
    ...(collector.tone === "bad" || (!stale && collector.label === "观测延迟") ? [collector.detail] : []),
    ...(backup.tone === "bad" || (!stale && backup.label === "备份延迟") ? [`${backup.label} · ${backup.detail}`] : []),
  ];
  return (
    <section className="space-y-5" aria-label="状态与待办">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="tracking-widest mb-1 text-12 font-medium text-tertiary">HAN WORK HUB</p>
          <h2 className="text-20 font-semibold text-primary">状态与待办</h2>
          <p className="mt-1 text-12 text-tertiary">运行状态、项目进度与下一步</p>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="hub-metrics">
        <Metric
          icon={Activity}
          title="Netatmo · 最近采集"
          indicator
          value={eventTime(netatmo?.collector.last_observation_utc)}
          detail={
            collector.tone === "good"
              ? ageLabel(netatmo?.collector.last_observation_utc)
              : `${collector.label} · ${collector.detail}`
          }
          tone={collector.tone}
          href={dataUrl}
        />
        <Metric
          icon={ShieldCheck}
          title="NAS · 最近备份"
          indicator
          value={eventTime(netatmo?.backup?.completed_utc)}
          detail={
            backup.tone === "good" ? ageLabel(netatmo?.backup?.completed_utc) : `${backup.label} · ${backup.detail}`
          }
          tone={backup.tone}
          href={dataUrl}
        />
        <Metric
          icon={ClipboardList}
          title="正在推进"
          value={`${number(data.plane.in_progress)} 项`}
          detail={`${data.plane.open - data.plane.in_progress} 项待开始`}
          href={`/${workspaceSlug}/projects/`}
        />
        <Metric
          icon={CircleAlert}
          title="逾期待处理"
          value={data.plane.total ? `${number(data.plane.overdue)} 项` : "尚无任务"}
          detail={
            data.plane.overdue
              ? "查看截止日期，安排下一步"
              : data.plane.total
                ? "当前没有逾期任务"
                : "先建立任务，开始跟踪进度"
          }
          tone={data.plane.overdue ? "warn" : "muted"}
          href={`/${workspaceSlug}/projects/`}
        />
      </div>
      <HubPortfolio workspaceSlug={workspaceSlug} projects={data.plane.portfolio} />
      <HubTasks
        workspaceSlug={workspaceSlug}
        plane={data.plane}
        onRefresh={async () => {
          await mutate();
        }}
      />
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
                    <span className="rounded bg-surface-2 px-1.5 text-secondary">{record.kind}</span>
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
        <div className="min-w-0 space-y-3 rounded-xl border border-subtle bg-surface-1 p-4 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-14 font-semibold text-primary">
            <CircleAlert size={16} />
            需要关注
          </h3>
          {netatmo?.archive.known_gap ? (
            <>
              <p className="text-13 text-warning-primary">历史观测存在缺口</p>
              <p className="text-12 text-secondary">{netatmo.archive.known_gap}</p>
            </>
          ) : (
            <p className="text-12 text-tertiary">{netatmo ? "暂无已记录的数据缺口" : "等待数据状态同步"}</p>
          )}
          {dataUrl && (
            <a href={dataUrl} className="inline-block text-12 text-accent-primary">
              查看采集与备份详情 ↗
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
