import { useState } from "react";
import { ChartNoAxesColumnIncreasing, Circle, Plus, ListTodo } from "lucide-react";
import { CreateUpdateIssueModal } from "@/components/issues/issue-modal/modal";
import { Badge } from "@plane/propel/badge";
import {
  completionPercent,
  featuredProjects,
  nativeViewUrl,
  projectStatus,
  priorityLabels,
} from "./hub-summary.helpers";
import type { HubSummary, HubRecord } from "./hub-summary.helpers";

function Progress({
  completed,
  total,
  label,
}: {
  completed: number;
  total: number;
  label: string;
}) {
  const percent = completionPercent(completed, total);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-12">
        <span className="text-secondary">{label}</span>
        <span className="shrink-0 text-primary">
          {percent === null ? "暂无任务" : `${percent}% · ${completed}/${total}`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={percent === null ? "暂无任务" : `${completed} / ${total} 项已完成`}
        className="h-1.5 overflow-hidden rounded-full bg-surface-1 border border-subtle"
      >
        <div
          className="h-full rounded-full bg-accent-primary transition-all"
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export function HubProjectProgress({
  workspaceSlug,
  plane,
  records,
}: {
  workspaceSlug: string;
  plane: HubSummary["plane"];
  records: HubRecord[];
}) {
  const projects = featuredProjects(plane.portfolio, records);
  return (
    <section
      className="min-w-0 rounded-lg border border-subtle bg-surface-1 p-4"
      aria-label="重点项目与下一步"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-14 font-semibold text-primary">
          <ChartNoAxesColumnIncreasing size={16} />
          重点项目与下一步
        </h3>
        <a href={`/${workspaceSlug}/projects/`} className="text-12 text-accent-primary">
          全部项目看板 ↗
        </a>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {projects.map((p) => (
          <article key={p.id} className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <a
                href={nativeViewUrl(workspaceSlug, p, "kanban")}
                className="text-14 font-semibold text-primary hover:text-accent-primary"
              >
                {p.name}
              </a>
              <Badge
                variant={
                  projectStatus(p) === "进行中"
                    ? "brand"
                    : projectStatus(p) === "等待反馈"
                      ? "warning"
                      : "neutral"
                }
              >
                {projectStatus(p)}
              </Badge>
            </div>
            <div className="mb-2 flex flex-wrap gap-2 text-11 text-tertiary">
              <span>{priorityLabels[p.priority ?? "none"] ?? "未设优先级"}</span>
              <span>· {p.open} 项未完成</span>
              {p.next?.target_date && <span>· 截止 {p.next.target_date}</span>}
            </div>
            <Progress label="事项进度" completed={p.completed} total={p.completed + p.open} />
            <p className="mt-2 text-11 text-tertiary">下一步</p>
            {p.next ? (
              <a
                href={`/${workspaceSlug}/projects/${p.id}/issues/${p.next.id}/`}
                title={p.next.name}
                className="mt-1 block line-clamp-2 break-words text-13 leading-relaxed text-primary hover:text-accent-primary"
              >
                {p.next.name}
              </a>
            ) : (
              <p className="mt-1 text-13 text-tertiary">暂无未完成事项</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-12 text-accent-primary">
              <a href={nativeViewUrl(workspaceSlug, p, "kanban")}>看板 ↗</a>
              <a href={nativeViewUrl(workspaceSlug, p, "gantt")}>时间轴 ↗</a>
            </div>
          </article>
        ))}
      </div>
      {!projects.length && (
        <p className="text-13 text-tertiary">暂无项目任务，建立任务后即可跟踪进度。</p>
      )}
      <p className="mt-3 text-11 text-tertiary">优先显示需推进的项目；进度按已录入事项计算。</p>
    </section>
  );
}

export function HubTasks({
  workspaceSlug,
  plane,
  onRefresh,
}: {
  workspaceSlug: string;
  plane: HubSummary["plane"];
  onRefresh: () => Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  return (
    <>
      <CreateUpdateIssueModal
        isOpen={creating}
        onClose={() => setCreating(false)}
        onSubmit={onRefresh}
        fetchIssueDetails={false}
      />
      <div className="min-w-0">
        <section
          className="min-w-0 rounded-lg border border-subtle bg-surface-1 p-4"
          aria-label="工作区待办"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-14 font-semibold text-primary">
              <ListTodo size={16} />
              接下来要做 <span className="text-tertiary">{plane.open}</span>
            </h3>
            <button
              type="button"
              disabled={!plane.projects}
              onClick={() => setCreating(true)}
              className="flex items-center gap-1 rounded px-2 py-1 text-12 text-accent-primary hover:bg-surface-2 disabled:opacity-50"
            >
              <Plus size={14} />
              新建任务
            </button>
          </div>
          {plane.todos.length ? (
            <ul className="divide-y divide-subtle">
              {plane.todos.map((todo) => (
                <li key={todo.id}>
                  <a
                    href={`/${workspaceSlug}/projects/${todo.project_id}/issues/${todo.id}/`}
                    className="flex items-start gap-2 rounded py-2.5 hover:bg-surface-2"
                  >
                    <Circle size={16} className="mt-0.5 shrink-0 text-accent-primary" />
                    <div className="min-w-0">
                      <p className="text-13 break-words text-primary">{todo.name}</p>
                      <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-11 text-tertiary">
                        <span>
                          {todo.project__identifier}-{todo.sequence_id}
                        </span>
                        <span>{plane.portfolio.find((p) => p.id === todo.project_id)?.name}</span>
                        <span>{todo.state__name}</span>
                        <span>{priorityLabels[todo.priority] ?? "未设优先级"}</span>
                        <span>{todo.target_date ? `截止 ${todo.target_date}` : "未设截止日"}</span>
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg bg-surface-2 px-4 py-6 text-center">
              <ListTodo size={24} className="mx-auto mb-2 text-tertiary" />
              <p className="text-13 text-secondary">
                {plane.total ? "当前任务已全部完成" : "还没有当前待办"}
              </p>
              <p className="mt-2 text-12 text-tertiary">
                点击“新建任务”开始安排下一步，历史工作日志不会自动变成待办。
              </p>
            </div>
          )}
          <p className="mt-3 text-11 text-tertiary">显示优先处理的前 8 项 · 点击进入任务</p>
        </section>
      </div>
    </>
  );
}
