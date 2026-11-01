/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { HubProjectNavigator } from "@/components/home/hub-project-navigator";
import { HubSummaryService } from "@/services/hub-summary.service";
import { observer } from "mobx-react";
import useSWR from "swr";
// assets
import emptyView from "@/app/assets/empty-state/view.svg?url";
// components
import { EmptyState } from "@/components/common/empty-state";
import { PageHead } from "@/components/core/page-title";
import { ProjectViewLayoutRoot } from "@/components/issues/issue-layouts/roots/project-view-layout-root";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useProjectView } from "@/hooks/store/use-project-view";
import { useAppRouter } from "@/hooks/use-app-router";
import type { Route } from "./+types/page";

const hubService = new HubSummaryService();

function ProjectViewIssuesPage({ params }: Route.ComponentProps) {
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId, viewId } = params;
  const { data: hub } = useSWR(`hub-summary:${workspaceSlug}`, () => hubService.getSummary(workspaceSlug));
  // store hooks
  const { fetchViewDetails, getViewById } = useProjectView();
  const { getProjectById } = useProject();
  // derived values
  const projectView = getViewById(viewId);
  const project = getProjectById(projectId);
  const pageTitle = project?.name && projectView?.name ? `${project?.name} - ${projectView?.name}` : undefined;

  const { error } = useSWR(`VIEW_DETAILS_${viewId}`, () => fetchViewDetails(workspaceSlug, projectId, viewId));

  if (error) {
    return (
      <EmptyState
        image={emptyView}
        title="View does not exist"
        description="The view you are looking for does not exist or you don't have permission to view it."
        primaryButton={{
          text: "View other views",
          onClick: () => router.push(`/${workspaceSlug}/projects/${projectId}/views`),
        }}
      />
    );
  }

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="flex h-full min-h-0 flex-col">
        {hub && <HubProjectNavigator workspaceSlug={workspaceSlug} projects={hub.plane.portfolio} projectId={projectId} viewId={viewId} key={projectId} />}
        {projectView?.name === "项目时间轴" && <p className="px-4 py-2 text-11 text-tertiary">历史成果按来源日期定位；单日记录不代表全天工时，历史结束日不代表新截止日。未定日期的任务仍可在左侧查看。</p>}
        <div className="min-h-0 flex-1"><ProjectViewLayoutRoot /></div>
      </div>
    </>
  );
}

export default observer(ProjectViewIssuesPage);
