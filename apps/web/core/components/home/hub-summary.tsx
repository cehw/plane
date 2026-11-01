import { HubAppearanceSwitch } from "@/components/appearance/hub-appearance-switch";
import type { ReactNode } from "react";
import { HubOnlineCollection } from "./hub-online-collection";
import { NasCapacity } from "./hub-nas-capacity";
import { ArrowUpRight, CircleAlert, ClipboardList, RefreshCw, ShieldCheck } from "lucide-react";
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

import { HubHomeTimeline } from "./hub-home-timeline";
import { nativeViewUrl } from "./hub-summary.helpers";
import { HubPortfolio } from "./hub-portfolio";
import { eventTime } from "./hub-summary.helpers";
import { HubTasks, HubProjectProgress } from "./hub-tasks";

const service = new HubSummaryService();
const number = (value?: number) => (value === undefined ? "—" : value.toLocaleString("zh-CN"));
const tones = {
  good: "text-success-primary",
  warn: "text-warning-primary",
  bad: "text-danger-primary",
  muted: "text-tertiary",
};

export function Metric({
  icon: Icon,
  title,
  value,
  detail,
  tone = "muted",
  href,
  indicator = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  detail: string;
  tone?: HubHealth["tone"];
  href?: string;
  indicator?: boolean;
  children?: ReactNode;
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
      {children}
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
  const dataUrl = `/${workspaceSlug}/data/`;
  const timelineProject = data.plane.portfolio.find((p) => p.dated > 0 && p.views?.gantt);
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
    <section className="space-y-4" aria-label="状态与待办">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-20 font-semibold text-primary">工作概览</h2>
          <p className="mt-1 text-12 text-tertiary">优先项目、当前待办与数据状态</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <HubAppearanceSwitch />
          <button
            type="button"
            onClick={() => void mutate()}
            disabled={isValidating}
            className="flex items-center gap-2 text-12 text-secondary"
            aria-label="刷新概览"
          >
            <RefreshCw
              size={14}
              className={isValidating ? "animate-spin" : ""}
              aria-hidden="true"
            />
            {snapshot ? `源状态 ${ageLabel(snapshot.generated_at)}` : "等待首次同步"}
          </button>
        </div>
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
      <HubHomeTimeline workspaceSlug={workspaceSlug} projects={data.plane.portfolio} />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <HubOnlineCollection snapshot={snapshot} href={`${dataUrl}#online-collection`} compact />
        <aside className="min-w-0 space-y-3">
          <a
            href={dataUrl}
            className="block min-w-0 rounded-lg border border-subtle bg-surface-1 p-4 hover:bg-surface-2"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-14 font-semibold">
                <ShieldCheck size={16} />
                备份与存储
              </h3>
              <ArrowUpRight size={14} className="text-tertiary" />
            </div>
            <p className={`mt-3 text-13 ${tones[backup.tone]}`}>
              {backup.label} · {eventTime(netatmo?.backup?.completed_utc)}
            </p>
            {backup.tone !== "good" && (
              <p className="mt-1 text-12 text-secondary">{backup.detail}</p>
            )}
            <NasCapacity share={netatmo?.nas_share} compact />
          </a>
          <div className="min-w-0 space-y-2 rounded-lg border border-subtle bg-surface-1 p-4">
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
              <p className="text-12 text-tertiary">
                {netatmo ? "暂无已记录的数据缺口" : "等待数据状态同步"}
              </p>
            )}
            {dataUrl && (
              <a href={dataUrl} className="inline-block text-12 text-accent-primary">
                查看采集与备份详情 ↗
              </a>
            )}
          </div>
        </aside>
      </div>
      <details className="rounded-lg border border-subtle bg-surface-1 p-4">
        <summary className="cursor-pointer text-14 font-semibold">
          项目进度与待办 · {number(data.plane.open)} 项未完成
        </summary>
        <div className="mt-4 space-y-4">
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-subtle bg-surface-1 px-4 py-3 sm:grid-cols-4"
            data-testid="hub-metrics"
          >
            {[
              { label: "进行中", value: data.plane.in_progress },
              {
                label: "待办",
                value: data.plane.open - data.plane.in_progress - data.plane.waiting_feedback,
              },
              { label: "等待反馈", value: data.plane.waiting_feedback },
              { label: "逾期", value: data.plane.overdue },
            ].map(({ label, value }) => (
              <a
                key={label}
                href={`/${workspaceSlug}/projects/`}
                className="flex items-baseline justify-between gap-3 text-12 text-secondary hover:text-accent-primary"
              >
                <span>{label}</span>
                <strong
                  className={`text-20 font-semibold ${label === "逾期" && value ? "text-warning-primary" : "text-primary"}`}
                >
                  {number(value)}
                </strong>
              </a>
            ))}
          </div>
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
            <HubProjectProgress
              workspaceSlug={workspaceSlug}
              plane={data.plane}
              records={data.work_records}
            />
            <HubTasks
              workspaceSlug={workspaceSlug}
              plane={data.plane}
              onRefresh={async () => {
                await mutate();
              }}
            />
          </div>
          <details className="rounded-xl border border-subtle bg-surface-1 p-4">
            <summary className="cursor-pointer text-14 font-semibold">
              全部 {data.plane.projects} 个项目 · 进展与下一步
            </summary>
            <div className="mt-4">
              <HubPortfolio workspaceSlug={workspaceSlug} projects={data.plane.portfolio} />
            </div>
          </details>
        </div>
      </details>
      <details className="rounded-lg border border-subtle bg-surface-1 p-4">
        <summary className="cursor-pointer text-14 font-semibold">最近工作记录</summary>
        <div className="mt-3 min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-14 font-semibold text-primary">
              <ClipboardList size={16} aria-hidden="true" />
              最近工作进展
            </h3>
            {timelineProject && (
              <a
                href={nativeViewUrl(workspaceSlug, timelineProject, "gantt")}
                className="shrink-0 text-12 text-accent-primary"
              >
                原生时间轴 ↗
              </a>
            )}
          </div>
          {records.length ? (
            <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {records.map((record) => (
                <li key={record.id} className="border-t border-subtle py-2">
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
      </details>
    </section>
  );
}
