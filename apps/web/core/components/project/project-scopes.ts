/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// The workdesk and native Projects views share this existing work taxonomy.
export const RESEARCH_PROJECT_GROUPS = [
  {
    id: "ongoing",
    name: "Ongoing",
    projects: [
      "Himawari",
      "LEGO ESM / UCM",
      "HydroTuring",
      "极端高温外推",
      "气候代理模型外推",
      "NeuralGCM 研究",
    ],
  },
  { id: "revision", name: "Revision", projects: ["GRL 修订"] },
  {
    id: "research-support",
    name: "研究支持",
    projects: ["共享科研数据", "研究基础设施", "文献阅读"],
  },
  { id: "academic", name: "学术事务", projects: ["论文审稿", "AI 教学", "ASCE"] },
];

export const PERSONAL_PROJECTS = ["个人网站", "全球求职", "差旅与报销", "量化模拟"];
export const STELLERUS_PROJECTS = ["Stellerus 风电", "Stellerus CLP", "WRF / LAE"];

export const PROJECT_SCOPES = [
  { id: "all", name: "全部" },
  { id: "research", name: "科研" },
  { id: "stellerus", name: "Stellerus" },
  { id: "personal", name: "Personal" },
  { id: "other", name: "其他" },
] as const;

export type ProjectScope = (typeof PROJECT_SCOPES)[number]["id"];

export function getProjectScope(name: string): Exclude<ProjectScope, "all"> {
  if (RESEARCH_PROJECT_GROUPS.some((group) => group.projects.includes(name))) return "research";
  if (STELLERUS_PROJECTS.includes(name)) return "stellerus";
  if (PERSONAL_PROJECTS.includes(name)) return "personal";
  return "other";
}

export function scopeProjectIds(
  ids: string[] | undefined,
  getProjectById: (id: string) => { name: string } | undefined,
  scope: ProjectScope,
): string[] | undefined {
  if (!ids || scope === "all") return ids;
  return ids.filter((id) => {
    const project = getProjectById(id);
    return project !== undefined && getProjectScope(project.name) === scope;
  });
}
