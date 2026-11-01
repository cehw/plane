import { useState } from "react";
import { ChartNoAxesColumnIncreasing, Circle, Plus, ListTodo } from "lucide-react";
import { CreateUpdateIssueModal } from "@/components/issues/issue-modal/modal";
import { completionPercent } from "./hub-summary.helpers";
import type { HubSummary } from "./hub-summary.helpers";

function Progress({ completed, total, label }: { completed: number; total: number; label: string }) {
  const percent = completionPercent(completed, total);
  return (
    <div className="space-y-2">
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
        className="h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full rounded-full bg-accent-primary transition-all" style={{ width: `${percent ?? 0}%` }} />
      </div>
    </div>
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section
          className="min-w-0 space-y-4 rounded-xl border border-subtle bg-surface-1 p-4 lg:col-span-2"
          aria-label="任务完成进度"
        >
          <h3 className="flex items-center gap-2 text-14 font-semibold text-primary">
            <ChartNoAxesColumnIncreasing size={16} />
            任务进度
          </h3>
          <Progress label="工作区总体完成率" completed={plane.completed} total={plane.total} />
          <p className="text-12 text-tertiary">
            {plane.completed} 已完成 · {plane.in_progress} 进行中 · {plane.open - plane.in_progress} 待开始
          </p>
          <div className="space-y-4 border-t border-subtle pt-4">
            {plane.project_progress
              .filter((p) => p.open + p.completed > 0)
              .map((p) => (
                <a key={p.project_id} href={`/${workspaceSlug}/projects/${p.project_id}/issues/`} className="block">
                  <Progress label={p.project__name} completed={p.completed} total={p.completed + p.open} />
                </a>
              ))}
          </div>
          <p className="text-11 leading-relaxed text-tertiary">按有效任务的完成数量计算；取消、归档和草稿不计入。</p>
        </section>
        <section
          className="min-w-0 rounded-xl border border-subtle bg-surface-1 p-4 lg:col-span-3"
          aria-label="工作区待办"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-14 font-semibold text-primary">
              <ListTodo size={16} />
              待办事项 <span className="text-tertiary">{plane.open}</span>
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
                    className="flex items-start gap-3 rounded py-3 hover:bg-surface-2"
                  >
                    <Circle size={16} className="mt-0.5 shrink-0 text-accent-primary" />
                    <div className="min-w-0">
                      <p className="text-13 break-words text-primary">{todo.name}</p>
                      <p className="mt-1 flex flex-wrap gap-x-2 text-11 text-tertiary">
                        <span>
                          {todo.project__identifier}-{todo.sequence_id}
                        </span>
                        <span>{todo.state__name}</span>
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
              <p className="text-13 text-secondary">{plane.total ? "当前任务已全部完成" : "还没有当前待办"}</p>
              <p className="mt-2 text-12 text-tertiary">点击“新建任务”开始安排下一步，历史工作日志不会自动变成待办。</p>
            </div>
          )}
          <p className="mt-3 text-11 text-tertiary">
            按截止日从近到远，无日期排后 · 显示前 8 项 · 点击任务进入原生页面更新状态
          </p>
        </section>
      </div>
    </>
  );
}
