/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useCallback, useEffect } from "react";
import { observer } from "mobx-react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { TProjectAppliedDisplayFilterKeys, TProjectFilters } from "@plane/types";
import { calculateTotalFilters, cn } from "@plane/utils";
// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useProjectFilter } from "@/hooks/store/use-project-filter";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useAppRouter } from "@/hooks/use-app-router";
// local imports
import { ProjectAppliedFiltersList } from "./applied-filters";
import { ProjectCardList } from "./card-list";
import { PROJECT_SCOPES, scopeProjectIds } from "./project-scopes";
import type { ProjectScope } from "./project-scopes";

export const ProjectRoot = observer(function ProjectRoot() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useAppRouter();
  const { t } = useTranslation();
  // store
  const { totalProjectIds, filteredProjectIds, getProjectById } = useProject();
  const {
    currentWorkspaceFilters,
    currentWorkspaceAppliedDisplayFilters,
    clearAllFilters,
    clearAllAppliedDisplayFilters,
    updateFilters,
    updateDisplayFilters,
  } = useProjectFilter();
  // derived values
  const pageTitle = currentWorkspace?.name
    ? `${currentWorkspace?.name} - ${t("workspace_projects.label", { count: 2 })}`
    : undefined;

  const isArchived = pathname.includes("/archives");
  const scope =
    PROJECT_SCOPES.find((option) => option.id === searchParams.get("scope"))?.id ?? "all";
  const scopedProjectIds = scopeProjectIds(filteredProjectIds, getProjectById, scope);
  const scopedTotalProjectIds = scopeProjectIds(totalProjectIds, getProjectById, scope);

  const selectScope = (nextScope: ProjectScope) => {
    const query = new URLSearchParams(searchParams.toString());
    if (nextScope === "all") query.delete("scope");
    else query.set("scope", nextScope);
    router.replace(`${pathname}${query.size ? `?${query.toString()}` : ""}`);
  };

  const allowedDisplayFilters =
    currentWorkspaceAppliedDisplayFilters?.filter((filter) => filter !== "archived_projects") ?? [];

  const handleRemoveFilter = useCallback(
    (key: keyof TProjectFilters, value: string | null) => {
      if (!workspaceSlug) return;
      let newValues = currentWorkspaceFilters?.[key] ?? [];

      if (!value) newValues = [];
      else newValues = newValues.filter((val) => val !== value);

      updateFilters(workspaceSlug.toString(), { [key]: newValues });
    },
    [currentWorkspaceFilters, updateFilters, workspaceSlug],
  );

  const handleRemoveDisplayFilter = useCallback(
    (key: TProjectAppliedDisplayFilterKeys) => {
      if (!workspaceSlug) return;
      updateDisplayFilters(workspaceSlug.toString(), { [key]: false });
    },
    [updateDisplayFilters, workspaceSlug],
  );

  const handleClearAllFilters = useCallback(() => {
    if (!workspaceSlug) return;
    clearAllFilters(workspaceSlug.toString());
    clearAllAppliedDisplayFilters(workspaceSlug.toString());
    if (isArchived) updateDisplayFilters(workspaceSlug.toString(), { archived_projects: true });
  }, [clearAllFilters, clearAllAppliedDisplayFilters, workspaceSlug]);

  useEffect(() => {
    updateDisplayFilters(workspaceSlug.toString(), { archived_projects: isArchived });
  }, [pathname]);

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="flex h-full w-full flex-col">
        <div className="flex shrink-0 items-end justify-between gap-4 border-b border-subtle px-6 pt-2">
          <div role="tablist" aria-label="项目分类" className="flex gap-1">
            {PROJECT_SCOPES.map((option) => (
              <button
                key={option.id}
                id={`project-scope-${option.id}`}
                type="button"
                role="tab"
                aria-selected={scope === option.id}
                aria-controls="project-scope-panel"
                onClick={() => selectScope(option.id)}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 py-2.5 text-13 transition-colors",
                  scope === option.id
                    ? "border-accent-primary font-medium text-primary"
                    : "border-transparent text-tertiary hover:text-primary",
                )}
              >
                {option.name}
                <span className="rounded-sm bg-layer-2 px-1.5 py-0.5 text-11 text-tertiary">
                  {scopeProjectIds(filteredProjectIds, getProjectById, option.id)?.length ?? 0}
                </span>
              </button>
            ))}
          </div>
          <p className="pb-3 text-11 text-tertiary">按工作线分类，状态与下一步在项目中维护</p>
        </div>
        {(calculateTotalFilters(currentWorkspaceFilters ?? {}) !== 0 ||
          allowedDisplayFilters.length > 0) && (
          <ProjectAppliedFiltersList
            appliedFilters={currentWorkspaceFilters ?? {}}
            appliedDisplayFilters={allowedDisplayFilters}
            handleClearAllFilters={handleClearAllFilters}
            handleRemoveFilter={handleRemoveFilter}
            handleRemoveDisplayFilter={handleRemoveDisplayFilter}
            filteredProjects={scopedProjectIds?.length ?? 0}
            totalProjects={scopedTotalProjectIds?.length ?? 0}
            alwaysAllowEditing
          />
        )}
        <div
          id="project-scope-panel"
          role="tabpanel"
          aria-labelledby={`project-scope-${scope}`}
          className="min-h-0 flex-1"
        >
          <ProjectCardList filteredProjectIds={scopedProjectIds} />
        </div>
      </div>
    </>
  );
});
