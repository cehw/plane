import { FolderKanban, ArrowUpRight } from "lucide-react";
import { nativeViewUrl } from "./hub-summary.helpers";
import type { HubSummary } from "./hub-summary.helpers";

export function HubPortfolio({
  workspaceSlug,
  projects,
}: {
  workspaceSlug: string;
  projects: HubSummary["plane"]["portfolio"];
}) {
  return (
    <section className="min-w-0" aria-label="项目看板与下一步">
      <h3 className="sr-only">
        <FolderKanban size={16} />
        项目看板与下一步 <span className="text-tertiary">{projects.length}</span>
      </h3>
      <div className="hidden grid-cols-12 gap-4 border-b border-subtle pb-2 text-11 text-tertiary md:grid">
        <span className="col-span-2">项目</span>
        <span className="col-span-6">最新已确认进展 · 记录时间</span>
        <span className="col-span-4">下一步</span>
      </div>
      <div className="divide-y divide-subtle">
        {projects.map((project) => (
          <div key={project.id} className="grid grid-cols-1 gap-2 py-3 md:grid-cols-12 md:gap-4">
            <div className="md:col-span-2">
              <a
                href={nativeViewUrl(workspaceSlug, project, "kanban")}
                className="flex items-start gap-1 text-13 font-medium text-primary md:col-span-2"
              >
                <span>
                  {project.name}
                  <span className="mt-1 block text-11 text-accent-primary">打开看板</span>
                </span>
                <ArrowUpRight size={13} className="mt-1 shrink-0 text-tertiary" />
              </a>
              {project.views?.gantt && (
                <a
                  href={nativeViewUrl(workspaceSlug, project, "gantt")}
                  className="mt-2 block text-11 text-accent-primary"
                >
                  时间轴 · {project.dated} 项有日期 ↗
                </a>
              )}
            </div>
            <p className="text-12 leading-relaxed text-secondary md:col-span-6">
              {project.description || "尚无进展摘要"}
            </p>
            <div className="text-12 md:col-span-4">
              {project.next ? (
                <a
                  href={`/${workspaceSlug}/projects/${project.id}/issues/${project.next.id}/`}
                  className="text-accent-primary"
                >
                  <span className="mb-1 inline-block rounded bg-surface-2 px-1.5 py-0.5 text-11 text-secondary">
                    {project.next.state__name}
                  </span>
                  <p>{project.next.name}</p>
                  {project.open > 1 && (
                    <span className="mt-1 block text-11 text-tertiary">
                      另有 {project.open - 1} 项，进入项目查看
                    </span>
                  )}
                </a>
              ) : (
                <span className="text-tertiary">未记录新的待办</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
