import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react";
import useSWR from "swr";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { GANTT_TIMELINE_TYPE } from "@plane/types";
import type { TIssue } from "@plane/types";
import { GanttChartRoot } from "@/components/gantt-chart/root";
import { currentViewDataWithView } from "@/components/gantt-chart/data";
import { monthView } from "@/components/gantt-chart/views";
import { TimeLineTypeContext } from "@/components/gantt-chart/contexts";
import { BaseGanttSidebar } from "@/components/base-layouts/gantt/sidebar";
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useTimeLineChart } from "@/hooks/use-timeline-chart";
import { IssueService } from "@/services/issue";
import { nativeViewUrl } from "./hub-summary.helpers";
import type { HubSummary } from "./hub-summary.helpers";
import {
  prepareTimelineItems,
  timelineDateLabel,
  timelineInitialDate,
} from "./hub-home-timeline.helpers";

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

export const HubHomeTimeline = observer(function HubHomeTimeline({
  workspaceSlug,
  projects,
}: {
  workspaceSlug: string;
  projects: HubSummary["plane"]["portfolio"];
}) {
  const [selection, setSelection] = useState("");
  const [ready, setReady] = useState(false);
  const timeline = useTimeLineChart(GANTT_TIMELINE_TYPE.ISSUE);
  const {
    rootIssueStore: { issues: issue },
  } = useIssueDetail();
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
    const previousView = timeline.currentView;
    const previousViewData = timeline.currentViewData;
    const previousRenderView = timeline.renderView;
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
  useEffect(() => {
    if (data) issue.addIssue(data.items);
  }, [data, issue]);
  const { dated, undated } = useMemo(
    () =>
      prepareTimelineItems(
        (data?.items ?? []).filter((item) => !selection || item.project_id === selection),
      ),
    [data, selection],
  );
  const blocks = useMemo(() => dated.map((item) => item.id), [dated]);
  const items = useMemo(() => Object.fromEntries(dated.map((item) => [item.id, item])), [dated]);
  const selectedProject = projects.find((project) => project.id === selection);
  const today = new Date().toLocaleDateString("sv-SE");
  const initialDate = useMemo(() => {
    const date = timelineInitialDate(dated, today);
    return date ? new Date(`${date}T12:00:00`) : undefined;
  }, [dated, today]);
  const itemHref = (item: TIssue) =>
    `/${workspaceSlug}/projects/${item.project_id}/issues/${item.id}/`;
  const projectName = (item: TIssue) =>
    projects.find((project) => project.id === item.project_id)?.name ?? "";
  return (
    <section
      className="min-w-0 overflow-hidden rounded-lg border border-subtle bg-surface-1"
      aria-label="项目原生时间轴"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle px-4 py-3">
        <h2 className="text-14 font-semibold">项目时间轴</h2>
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
      {error || data?.failed.length ? (
        <p role="status" className="px-4 py-2 text-12 text-warning-primary">
          部分项目未能读取：{data?.failed.join("、") ?? "请刷新重试"}。当前显示已成功读取的事项。
        </p>
      ) : null}
      {isLoading || !ready ? (
        <p className="px-4 py-6 text-13 text-tertiary">正在读取 Plane 项目日期…</p>
      ) : dated.length ? (
        <TimeLineTypeContext.Provider value={GANTT_TIMELINE_TYPE.ISSUE}>
          <div className="h-[360px] min-w-0 sm:h-[400px]">
            <GanttChartRoot
              key={selection || "all"}
              title="项目 / 事项"
              loaderTitle="项有日期"
              border={false}
              initialDate={initialDate}
              blockIds={blocks}
              blockUpdateHandler={noUpdate}
              blockToRender={(item: TIssue) => {
                const complete = !!item.start_date && !!item.target_date;
                return (
                  <a
                    href={itemHref(item)}
                    title={`${projectName(item)} · ${item.name} · ${timelineDateLabel(item)}`}
                    className={
                      complete
                        ? "flex h-full w-full items-center overflow-hidden rounded-sm border border-accent-subtle bg-accent-primary/15 px-2 text-12 text-primary"
                        : `absolute flex items-center gap-1 whitespace-nowrap text-12 text-accent-primary ${item.start_date ? "left-0" : "right-0"}`
                    }
                  >
                    {!complete && <span aria-hidden="true">◆</span>}
                    <span className="truncate">
                      {complete ? item.name : timelineDateLabel(item)}
                    </span>
                  </a>
                );
              }}
              sidebarToRender={(props) => (
                <BaseGanttSidebar
                  {...props}
                  showAllBlocks
                  items={items}
                  renderItem={(item: TIssue) => (
                    <a
                      href={itemHref(item)}
                      title={`${item.name} · ${timelineDateLabel(item)}`}
                      className="block truncate text-12 text-primary hover:text-accent-primary"
                    >
                      <span className="mr-2 text-11 text-tertiary">{projectName(item)}</span>
                      {item.name}
                    </a>
                  )}
                />
              )}
              showAllBlocks
            />
          </div>
        </TimeLineTypeContext.Provider>
      ) : (
        <p className="px-4 py-6 text-13 text-tertiary">当前项目尚未记录确定日期。</p>
      )}
      <div className="border-t border-subtle px-4 py-2 text-11 text-tertiary">
        Plane 原生事项 · {dated.length} 项有日期 · {undated.length}{" "}
        项未定日期；单端日期只标明已知的开始或截止，点击事项可编辑。
        {undated.length > 0 && (
          <details className="mt-1">
            <summary className="cursor-pointer text-secondary">查看未定日期事项</summary>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {undated.map((item) => (
                <li key={item.id}>
                  <a href={itemHref(item)} className="text-accent-primary">
                    {projectName(item)} · {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
});
