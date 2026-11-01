/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Badge } from "@plane/propel/badge";
import { HubSummaryService } from "@/services/hub-summary.service";
import { nativeViewUrl, projectStatus } from "@/components/home/hub-summary.helpers";
import type { HubSummary } from "@/components/home/hub-summary.helpers";
import { RESEARCH_PROJECT_GROUPS } from "./project-scopes";
// plane imports
import { EUserPermissionsLevel, EUserPermissions } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import { ContentWrapper } from "@plane/ui";
// components
import { calculateTotalFilters } from "@plane/utils";
import { ProjectsLoader } from "@/components/ui/loader/projects-loader";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProject } from "@/hooks/store/use-project";
import { useProjectFilter } from "@/hooks/store/use-project-filter";
import { useUserPermissions } from "@/hooks/store/user";
// local imports
import { ProjectCard } from "./card";

const hubSummaryService = new HubSummaryService();

type TProjectCardListProps = {
  totalProjectIds?: string[];
  filteredProjectIds?: string[];
};

export const ProjectCardList = observer(function ProjectCardList(props: TProjectCardListProps) {
  const { totalProjectIds: totalProjectIdsProps, filteredProjectIds: filteredProjectIdsProps } =
    props;
  const { workspaceSlug } = useParams();
  const scope = useSearchParams().get("scope");
  const slug = workspaceSlug.toString();
  const { data: summary, error: summaryError } = useSWR(
    `hub-summary:${slug}`,
    () => hubSummaryService.getSummary(slug),
    { refreshInterval: 60000 },
  );
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { toggleCreateProjectModal } = useCommandPalette();
  const {
    loader,
    fetchStatus,
    workspaceProjectIds: storeWorkspaceProjectIds,
    filteredProjectIds: storeFilteredProjectIds,
    getProjectById,
  } = useProject();
  const { currentWorkspaceDisplayFilters, currentWorkspaceFilters } = useProjectFilter();
  const { allowPermissions } = useUserPermissions();

  // derived values
  const workspaceProjectIds = totalProjectIdsProps ?? storeWorkspaceProjectIds;
  const filteredProjectIds = filteredProjectIdsProps ?? storeFilteredProjectIds;

  // permissions
  const canPerformEmptyStateActions = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE,
  );

  if (
    !filteredProjectIds ||
    !workspaceProjectIds ||
    loader === "init-loader" ||
    fetchStatus !== "complete"
  )
    return <ProjectsLoader />;

  if (workspaceProjectIds?.length === 0 && !currentWorkspaceDisplayFilters?.archived_projects)
    return (
      <EmptyStateDetailed
        title={t("workspace_projects.empty_state.general.title")}
        description={t("workspace_projects.empty_state.general.description")}
        assetKey="project"
        assetClassName="size-40"
        actions={[
          {
            label: t("workspace_projects.empty_state.general.primary_button.text"),
            onClick: () => {
              toggleCreateProjectModal(true);
            },
            disabled: !canPerformEmptyStateActions,
            variant: "primary",
          },
        ]}
      />
    );

  if (filteredProjectIds.length === 0)
    return (
      <EmptyStateDetailed
        title={
          currentWorkspaceDisplayFilters?.archived_projects &&
          calculateTotalFilters(currentWorkspaceFilters ?? {}) === 0
            ? t("workspace_empty_state.projects_archived.title")
            : t("common_empty_state.search.title")
        }
        description={
          currentWorkspaceDisplayFilters?.archived_projects &&
          calculateTotalFilters(currentWorkspaceFilters ?? {}) === 0
            ? t("workspace_empty_state.projects_archived.description")
            : t("common_empty_state.search.description")
        }
        assetKey={
          currentWorkspaceDisplayFilters?.archived_projects &&
          calculateTotalFilters(currentWorkspaceFilters ?? {}) === 0
            ? "archived-work-item"
            : "search"
        }
        assetClassName="size-40"
      />
    );

  const groups =
    scope === "research"
      ? RESEARCH_PROJECT_GROUPS.map((group) => ({
          ...group,
          ids: filteredProjectIds.filter((id) =>
            group.projects.includes(getProjectById(id)?.name ?? ""),
          ),
        })).filter((group) => group.ids.length > 0)
      : [{ id: "all", name: "", ids: filteredProjectIds }];
  const portfolio = new Map(summary?.plane.portfolio.map((project) => [project.id, project]));
  const historyPages = new Map(
    summary?.work_records
      .filter((record) => record.project_id && record.page_id)
      .map((record) => [record.project_id, record.page_id]),
  );
  const visibleProjects = filteredProjectIds.flatMap((id) => {
    const project = portfolio.get(id);
    return project ? [project] : [];
  });

  return (
    <ContentWrapper>
      {summaryError && (
        <p role="status" className="mb-4 text-12 text-warning-primary">
          项目状态刷新失败，已有摘要保留；请进入项目核对。
        </p>
      )}
      {summary && visibleProjects.length === filteredProjectIds.length && (
        <p className="mb-5 text-12 text-secondary" aria-label="当前项目汇总">
          {filteredProjectIds.length} 个项目 ·{" "}
          {visibleProjects.reduce((total, project) => total + project.open, 0)} 项未完成 ·{" "}
          {visibleProjects.reduce((total, project) => total + (project.waiting_feedback ?? 0), 0)}{" "}
          项等待反馈
          <span className="ml-3 text-tertiary">状态取自当前事项；历史总结保留原记录日期。</span>
        </p>
      )}
      <div className="space-y-7">
        {groups.map((group) => (
          <section key={group.id} aria-label={group.name || "全部项目"}>
            {group.name && (
              <h2 className="mb-3 flex items-center gap-2 text-14 font-semibold text-primary">
                {group.name}
                <span className="text-12 font-normal text-tertiary">{group.ids.length}</span>
              </h2>
            )}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {group.ids.map((projectId) => {
                const projectDetails = getProjectById(projectId);
                if (!projectDetails) return null;
                const project = portfolio.get(projectId);
                return (
                  <article
                    key={projectId}
                    className="flex min-w-0 flex-col"
                    aria-label={projectDetails.name}
                  >
                    <ProjectCard
                      project={projectDetails}
                      className={project ? "rounded-b-none border-b-0" : undefined}
                    />
                    {project && (
                      <ProjectHubSummary
                        workspaceSlug={slug}
                        project={project}
                        historyPageId={historyPages.get(projectId)}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </ContentWrapper>
  );
});

function ProjectHubSummary({
  workspaceSlug,
  project,
  historyPageId,
}: {
  workspaceSlug: string;
  project: HubSummary["plane"]["portfolio"][number];
  historyPageId?: string;
}) {
  const status = projectStatus(project);
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-b-lg border border-subtle bg-layer-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant={status === "进行中" ? "brand" : status === "等待反馈" ? "warning" : "neutral"}
        >
          {status}
        </Badge>
        <span className="text-11 text-tertiary">{project.open} 项未完成</span>
      </div>
      <div className="min-h-14">
        <p className="mb-1 text-11 text-tertiary">下一步</p>
        {project.next ? (
          <a
            href={`/${workspaceSlug}/projects/${project.id}/issues/${project.next.id}/`}
            className="block text-13 leading-relaxed text-primary hover:text-accent-primary"
          >
            {project.next.name}
          </a>
        ) : (
          <p className="text-13 text-tertiary">未记录新的待办</p>
        )}
      </div>
      <div className="mt-auto flex flex-wrap gap-4 text-12 text-accent-primary">
        <a href={nativeViewUrl(workspaceSlug, project, "kanban")}>看板 ↗</a>
        <a href={nativeViewUrl(workspaceSlug, project, "gantt")}>时间轴 ↗</a>
        {historyPageId && (
          <a href={`/${workspaceSlug}/projects/${project.id}/pages/${historyPageId}/`}>
            历史总结 ↗
          </a>
        )}
      </div>
    </div>
  );
}
