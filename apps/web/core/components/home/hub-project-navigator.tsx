import { useState } from "react";
import { Columns3, GanttChart, Database, ArrowLeft } from "lucide-react";
import { Button } from "@plane/propel/button";
import { useAppRouter } from "@/hooks/use-app-router";
import { nativeViewUrl } from "./hub-summary.helpers";
import type { HubSummary } from "./hub-summary.helpers";

export function HubProjectNavigator({
  workspaceSlug,
  projects,
  projectId,
  viewId,
}: {
  workspaceSlug: string;
  projects: HubSummary["plane"]["portfolio"];
  projectId?: string;
  viewId?: string;
}) {
  const [selection, setSelection] = useState(projectId ?? "");
  const router = useAppRouter();
  const project =
    projects.find((p) => p.id === selection) ?? projects.find((p) => p.dated > 0) ?? projects[0];
  const open = (layout: "kanban" | "gantt") => {
    if (project) router.push(nativeViewUrl(workspaceSlug, project, layout));
  };
  return (
    <section
      id="hub-project-views"
      aria-label="原生项目视图"
      className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-subtle bg-surface-1 p-3"
    >
      {projectId && (
        <Button
          variant="tertiary"
          size="sm"
          prependIcon={<ArrowLeft />}
          onClick={() => router.push(`/${workspaceSlug}/`)}
        >
          Hub 首页
        </Button>
      )}
      <label className="text-12 text-secondary" htmlFor="hub-view-project">
        项目
      </label>
      <select
        id="hub-view-project"
        value={project?.id ?? ""}
        onChange={(e) => setSelection(e.target.value)}
        className="max-w-full rounded-md border border-subtle bg-surface-2 px-3 py-1.5 text-13 text-primary"
      >
        {projects.map((p) => (
          <option value={p.id} key={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button
        variant={viewId === project?.views?.kanban ? "primary" : "secondary"}
        size="sm"
        prependIcon={<Columns3 />}
        disabled={!project?.views?.kanban}
        onClick={() => open("kanban")}
      >
        看板
      </Button>
      <Button
        variant={viewId === project?.views?.gantt ? "primary" : "secondary"}
        size="sm"
        prependIcon={<GanttChart />}
        disabled={!project?.views?.gantt}
        onClick={() => open("gantt")}
      >
        时间轴
      </Button>
      <Button
        variant="tertiary"
        size="sm"
        prependIcon={<Database />}
        onClick={() => router.push(`/${workspaceSlug}/data/`)}
      >
        数据资产
      </Button>
      {project && (
        <span className="text-11 text-tertiary">
          {project.dated} 项有日期 · {project.undated} 项未定日期
        </span>
      )}
    </section>
  );
}
