import { useEffect, useMemo, useState } from "react";
import { autorun } from "mobx";
import { observer } from "mobx-react";
import useSWR from "swr";
import { ArrowUpRight, ChevronDown, ChevronRight, RefreshCw, X } from "lucide-react";
import { GANTT_TIMELINE_TYPE } from "@plane/types";
import type { TIssue } from "@plane/types";
import { EModalWidth, ModalCore } from "@plane/ui";
import { GanttChartRoot } from "@/components/gantt-chart/root";
import { currentViewDataWithView } from "@/components/gantt-chart/data";
import { monthView } from "@/components/gantt-chart/views";
import { TimeLineTypeContext } from "@/components/gantt-chart/contexts";
import { BaseGanttSidebar } from "@/components/base-layouts/gantt/sidebar";
import { useTimeLineChart } from "@/hooks/use-timeline-chart";
import { IssueService } from "@/services/issue";
import { nativeViewUrl } from "./hub-summary.helpers";
import type { HubRecord, HubSummary } from "./hub-summary.helpers";
import {
  buildTimelineEntries,
  buildTimelineTree,
  flattenTimelineTree,
  timelineDateLabel,
  timelineEntryHref,
  timelineInitialDate,
  timelineKinds,
  timelineSummarySegments,
} from "./hub-home-timeline.helpers";
import type { TimelineEntry, TimelineRow } from "./hub-home-timeline.helpers";

const issueService = new IssueService();
async function readProjectItems(workspaceSlug: string, projectId: string): Promise<TIssue[]> {
  const items: TIssue[] = [];
  let cursor: string | undefined;
  do {
    const page = await issueService.getIssues(workspaceSlug, projectId, {
      per_page: "100",
      order_by: "-target_date",
      ...(cursor ? { cursor } : {}),
    });
    if (!Array.isArray(page.results)) throw new Error("Unexpected grouped issue response");
    items.push(...page.results);
    if (page.next_page_results && !page.next_cursor)
      throw new Error("Missing next issue page cursor");
    cursor = page.next_page_results ? page.next_cursor : undefined;
  } while (cursor);
  return items;
}
const noUpdate = () => {};
const colors: Record<string, string> = {
  已做: "#6c80c8",
  进行中: "#b58031",
  计划: "#9371b5",
  汇报: "#318876",
};
const color = (kind: string) => colors[kind] ?? "#788496";
const recordTitle = (entry: TimelineEntry) =>
  `${entry.project}${entry.siteScope ? ` · ${entry.siteScope}` : ""} · ${entry.name} · ${timelineDateLabel(entry)} · ${entry.kind}${entry.origin === "record" ? "（历史记录）" : ""}`;
const defaultExpanded = ["category:research", "category:stellerus"];

export const HubHomeTimeline = observer(function HubHomeTimeline({
  workspaceSlug,
  projects,
  records,
}: {
  workspaceSlug: string;
  projects: HubSummary["plane"]["portfolio"];
  records: HubRecord[];
}) {
  const [selection, setSelection] = useState("");
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(defaultExpanded));
  const [selectedEntries, setSelectedEntries] = useState<TimelineEntry[]>([]);
  const [jump, setJump] = useState(0);
  const timeline = useTimeLineChart(GANTT_TIMELINE_TYPE.GROUPED);
  const projectIds = projects
    .map((project) => project.id)
    .sort()
    .join(",");
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    projectIds ? ["hub-home-timeline", workspaceSlug, projectIds] : null,
    async () => {
      const results = await Promise.allSettled(
        projects.map((project) => readProjectItems(workspaceSlug, project.id)),
      );
      return {
        items: results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
        failed: results.flatMap((result, index) =>
          result.status === "rejected" ? [projects[index].name] : [],
        ),
      };
    },
    { refreshInterval: 60000, revalidateOnFocus: true },
  );
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        localStorage.getItem(`hub-timeline-groups:${workspaceSlug}`) ?? "null",
      );
      if (Array.isArray(saved) && saved.every((value) => typeof value === "string"))
        setExpanded(new Set(saved));
    } catch {
      /* Keep the initial view when no local preference can be read. */
    }
  }, [workspaceSlug]);
  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
    try {
      localStorage.setItem(`hub-timeline-groups:${workspaceSlug}`, JSON.stringify([...next]));
    } catch {
      /* In-memory view remains usable. */
    }
  };
  useEffect(() => {
    const previousView = timeline.currentView,
      previousViewData = timeline.currentViewData,
      previousRenderView = timeline.renderView;
    const monthData = currentViewDataWithView("month");
    if (!monthData) return;
    const initialChart = monthView.generateChart(monthData, null);
    timeline.updateCurrentView("month");
    timeline.initGantt();
    timeline.updateCurrentViewData(initialChart.state);
    timeline.updateRenderView(initialChart.payload);
    setReady(true);
    return () => {
      timeline.updateCurrentView(previousView);
      timeline.initGantt();
      timeline.updateCurrentViewData(previousViewData);
      timeline.updateRenderView(previousRenderView);
    };
  }, [timeline]);
  const prepared = useMemo(
    () => buildTimelineEntries(records, data?.items ?? [], projects),
    [records, data, projects],
  );
  const dated = useMemo(
    () => prepared.dated.filter((entry) => !selection || entry.project_id === selection),
    [prepared, selection],
  );
  const undated = useMemo(
    () => prepared.undated.filter((entry) => !selection || entry.project_id === selection),
    [prepared, selection],
  );
  const tree = useMemo(() => buildTimelineTree(dated), [dated]);
  const rows = useMemo(() => flattenTimelineTree(tree, expanded), [tree, expanded]);
  const blocks = useMemo(() => rows.map((row) => row.id), [rows]);
  const items = useMemo(() => Object.fromEntries(rows.map((row) => [row.id, row])), [rows]);
  useEffect(() => {
    timeline.setBlockIds(blocks);
    return autorun(() => {
      if (timeline.currentViewData) timeline.updateBlocks((id) => items[id]);
    });
  }, [timeline, blocks, items]);
  const selectedProject = projects.find((project) => project.id === selection);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date());
  const initialDate = useMemo(() => {
    const historical = dated.filter((entry) => entry.origin === "record");
    const date = timelineInitialDate(historical.length ? historical : dated, today);
    return date ? new Date(`${date}T12:00:00`) : undefined;
  }, [dated, today]);
  const itemLink = (entry: TimelineEntry) => timelineEntryHref(workspaceSlug, entry);
  const renderBlock = (row: TimelineRow) => {
    if (row.type === "entry") {
      const entry = row.entries[0],
        complete = !!entry.start_date && !!entry.target_date;
      return (
        <a
          href={itemLink(entry)}
          title={recordTitle(entry)}
          className={
            complete
              ? "flex h-7 w-full items-center overflow-hidden rounded-sm border px-2 text-12 text-primary hover:brightness-95"
              : `absolute flex items-center gap-1 whitespace-nowrap text-12 text-primary ${entry.start_date ? "left-0" : "right-0"}`
          }
          style={
            complete
              ? { borderColor: color(entry.kind), backgroundColor: `${color(entry.kind)}25` }
              : undefined
          }
        >
          {!complete && (
            <span aria-hidden="true" style={{ color: color(entry.kind) }}>
              ◆
            </span>
          )}
          <span className="truncate">{complete ? entry.name : timelineDateLabel(entry)}</span>
        </a>
      );
    }
    const visibleKinds = [...timelineKinds, "原生事项"].filter((kind) =>
      row.entries.some((entry) => entry.kind === kind),
    );
    return (
      <div
        className="relative h-8 w-full"
        aria-label={`${row.name} · ${row.entries.length} 条日期记录`}
      >
        {timelineSummarySegments(row).map((segment) => {
          const lane = Math.max(0, visibleKinds.indexOf(segment.kind));
          const style = {
            left: `${segment.left}%`,
            width: `${segment.width}%`,
            top: `${3 + lane * (24 / visibleKinds.length)}px`,
            height: visibleKinds.length > 4 ? 4 : 6,
            backgroundColor: color(segment.kind),
          };
          const label = segment.entries.map(recordTitle).join("；");
          const className =
            "absolute min-w-[4px] h-1.5 rounded-sm ring-offset-1 hover:ring-2 hover:ring-accent-primary focus-visible:ring-2 focus-visible:ring-accent-primary";
          return segment.entries.length === 1 ? (
            <a
              key={segment.key}
              href={itemLink(segment.entries[0])}
              title={label}
              aria-label={label}
              className={className}
              style={style}
            />
          ) : (
            <button
              key={segment.key}
              type="button"
              title={`${segment.entries.length} 条记录：${label}`}
              aria-label={`${segment.start} · ${segment.kind} · ${segment.entries.length} 条记录`}
              className={className}
              style={style}
              onClick={() => setSelectedEntries(segment.entries)}
            />
          );
        })}
      </div>
    );
  };
  return (
    <section
      className="min-w-0 overflow-hidden rounded-lg border border-subtle bg-surface-1"
      aria-label="项目原生时间轴"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-14 font-semibold">项目时间轴</h2>
          <span className="text-11 text-tertiary">按工作线展开</span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <select
            aria-label="时间轴项目"
            value={selection}
            onChange={(event) => setSelection(event.target.value)}
            className="max-w-full rounded-md border border-subtle bg-surface-1 px-2 py-1 text-12"
          >
            <option value="">全部项目</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setJump((value) => value + 1)}
            className="rounded-md border border-subtle px-2 py-1 text-12 text-secondary hover:bg-surface-2"
          >
            最近记录
          </button>
          {selectedProject && (
            <a
              href={nativeViewUrl(workspaceSlug, selectedProject, "gantt")}
              className="flex items-center gap-1 text-12 text-accent-primary"
            >
              项目视图
              <ArrowUpRight size={12} />
            </a>
          )}
          <button
            type="button"
            aria-label="刷新时间轴"
            disabled={isValidating}
            onClick={() => void mutate()}
            className="rounded p-1 text-secondary hover:bg-surface-2"
          >
            <RefreshCw size={14} className={isValidating ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-11 text-secondary">
        {timelineKinds.map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-sm" style={{ backgroundColor: color(kind) }} />
            {kind}
          </span>
        ))}
        <span className="text-tertiary">历史记录类型 · 横条保留原始日期</span>
      </div>
      {error || data?.failed.length ? (
        <p role="status" className="px-4 py-2 text-12 text-warning-primary">
          部分原生事项未能读取：{data?.failed.join("、") ?? "请刷新重试"}。已同步的历史记录仍保留。
        </p>
      ) : null}
      {!ready || (isLoading && !dated.length) ? (
        <p className="px-4 py-6 text-13 text-tertiary">正在读取项目日期…</p>
      ) : dated.length ? (
        <TimeLineTypeContext.Provider value={GANTT_TIMELINE_TYPE.GROUPED}>
          <div className="h-[400px] min-w-0">
            <GanttChartRoot
              key={`${selection || "all"}:${jump}`}
              title="分类 / 工作线 / 事项"
              loaderTitle="行"
              border={false}
              initialDate={initialDate}
              blockIds={blocks}
              blockUpdateHandler={noUpdate}
              blockToRender={renderBlock}
              showAllBlocks
              showDuration={false}
              sidebarToRender={(props) => (
                <BaseGanttSidebar
                  {...props}
                  showAllBlocks
                  showDuration={false}
                  items={items}
                  renderItem={(row: TimelineRow) =>
                    row.type === "entry" ? (
                      <a
                        href={itemLink(row.entries[0])}
                        title={recordTitle(row.entries[0])}
                        className="block truncate text-12 text-primary hover:text-accent-primary"
                        style={{ paddingLeft: row.level * 10 }}
                      >
                        <span
                          className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: color(row.entries[0].kind) }}
                        />
                        {row.name}
                      </a>
                    ) : (
                      <button
                        type="button"
                        aria-expanded={expanded.has(row.id)}
                        onClick={() => toggle(row.id)}
                        title={`${row.name} · ${row.entries.length} 条记录`}
                        className={`flex w-full min-w-0 items-center gap-1.5 text-left text-12 text-primary hover:text-accent-primary ${row.type === "category" ? "font-semibold" : ""}`}
                        style={{ paddingLeft: row.level * 10 }}
                      >
                        {expanded.has(row.id) ? (
                          <ChevronDown size={14} className="shrink-0" />
                        ) : (
                          <ChevronRight size={14} className="shrink-0" />
                        )}
                        <span className="truncate">{row.name}</span>
                        <span className="ml-auto shrink-0 text-11 font-normal text-tertiary">
                          {row.entries.length}
                        </span>
                      </button>
                    )
                  }
                />
              )}
            />
          </div>
        </TimeLineTypeContext.Provider>
      ) : (
        <p className="px-4 py-6 text-13 text-tertiary">当前项目尚未记录确定日期。</p>
      )}
      <div className="border-t border-subtle px-4 py-2 text-11 text-tertiary">
        {dated.length} 条有日期记录 · {undated.length}{" "}
        项未定日期。汇总横条的空白保持空白；日期跨度不代表连续工作或完成比例。
        {undated.length > 0 && (
          <details className="mt-1">
            <summary className="cursor-pointer text-secondary">查看未定日期事项</summary>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {undated.map((entry) => (
                <li key={entry.id}>
                  <a href={itemLink(entry)} className="text-accent-primary">
                    {entry.project} · {entry.name}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      <ModalCore
        isOpen={selectedEntries.length > 0}
        handleClose={() => setSelectedEntries([])}
        width={EModalWidth.MD}
      >
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-16 font-semibold">同一日期的 {selectedEntries.length} 条记录</h3>
            <button
              type="button"
              aria-label="关闭记录列表"
              onClick={() => setSelectedEntries([])}
              className="rounded p-1 hover:bg-surface-2"
            >
              <X size={16} />
            </button>
          </div>
          <ul className="max-h-[60vh] divide-y divide-subtle overflow-y-auto">
            {selectedEntries.map((entry) => (
              <li key={entry.id} className="py-3">
                <a href={itemLink(entry)} className="text-13 font-medium text-accent-primary">
                  {entry.name} ↗
                </a>
                <p className="mt-1 text-11 text-secondary">
                  {entry.project}
                  {entry.siteScope ? ` · ${entry.siteScope}` : ""} · {timelineDateLabel(entry)} ·{" "}
                  {entry.kind}
                </p>
                {entry.detail && <p className="mt-1 text-12 text-tertiary">{entry.detail}</p>}
              </li>
            ))}
          </ul>
        </div>
      </ModalCore>
    </section>
  );
});
