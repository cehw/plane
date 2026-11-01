export type HubRecord = {
  id: string;
  project: string;
  title: string;
  kind: string;
  start: string;
  end: string;
};
export type NasShare = {
  name: string;
  scope: "shared_folder";
  used: number;
  total: number;
  unit: "TB";
  observed_at: string;
  source: string;
  refresh_mode: "manual";
};
export type NasVolume = {
  name?: string;
  used_bytes?: number;
  total_bytes?: number;
  free_bytes?: number;
  observed_at?: string;
  error?: string;
};
export type HubSnapshot = {
  generated_at: string;
  received_at?: string;
  hres?: { policy?: string; status?: string };
  netatmo: {
    service: string;
    nas_share?: NasShare;
    nas_volume?: NasVolume;
    recent_stations: number;
    recent_countries: number;
    combined_stations?: number;
    legacy_reference_stations?: number;
    overlap_stations?: number;
    recent_module_observations?: number;
    map_cells?: [number, number, number, number, number][];
    countries?: [string, number, number, number][];
    restore_test?: { tested_at?: string; result?: string; csv_rows?: number; sqlite_rows?: number };
    new_since_reference: number;
    collector: { last_observation_utc?: string; global_scan_complete?: boolean };
    tiles: { active?: number; successful: number; failed: number; pending: number };
    archive: { bytes: number; csv_files: number; known_gap?: string };
    backup?: {
      completed_utc?: string;
      state?: string;
      snapshot_cutoff_utc?: string;
      destination?: string;
    };
    backup_attempt?: { state?: string; started_utc?: string };
  };
};
export type HubSummary = {
  snapshot: HubSnapshot | null;
  snapshot_error: string | null;
  work_records: HubRecord[];
  work_records_updated_at: string | null;
  workdesk_url: string | null;
  plane: {
    projects: number;
    open: number;
    in_progress: number;
    waiting_feedback: number;
    overdue: number;
    completed: number;
    total: number;
    todos: {
      id: string;
      name: string;
      project_id: string;
      project__identifier: string;
      sequence_id: number;
      state__name: string;
      state__group: string;
      priority: string;
      target_date: string | null;
    }[];
    portfolio: {
      id: string;
      name: string;
      description: string;
      priority?: string;
      in_progress?: number;
      waiting_feedback?: number;
      views?: { kanban?: string; gantt?: string };
      dated: number;
      undated: number;
      open: number;
      completed: number;
      next: {
        id: string;
        name: string;
        state__name: string;
        state__group: string;
        priority?: string;
        target_date?: string | null;
      } | null;
    }[];
    project_progress: {
      project_id: string;
      project__name: string;
      open: number;
      completed: number;
    }[];
  };
};
export type HubHealth = { label: string; tone: "good" | "warn" | "bad" | "muted"; detail: string };

export function ageMinutes(value?: string | null, now = Date.now()): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? Math.max(0, (now - parsed) / 60000) : null;
}

export function ageLabel(value?: string | null, now = Date.now()): string {
  const age = ageMinutes(value, now);
  if (age === null) return "尚无时间记录";
  if (age < 1) return "刚刚";
  if (age < 60) return `${Math.floor(age)} 分钟前`;
  if (age < 1440) return `${Math.floor(age / 60)} 小时前`;
  return `${Math.floor(age / 1440)} 天前`;
}

export function snapshotIsStale(snapshot: HubSnapshot | null, now = Date.now()): boolean {
  const age = ageMinutes(snapshot?.generated_at, now);
  return age === null || age > 90;
}

export function collectorHealth(snapshot: HubSnapshot | null, now = Date.now()): HubHealth {
  if (!snapshot) return { label: "等待同步", tone: "muted", detail: "尚未接收到 Climet3 状态" };
  if (snapshotIsStale(snapshot, now))
    return { label: "状态已过期", tone: "warn", detail: "无法确认当前运行情况" };
  if (snapshot.netatmo.service !== "active")
    return { label: "需要检查", tone: "bad", detail: `服务：${snapshot.netatmo.service}` };
  const age = ageMinutes(snapshot.netatmo.collector.last_observation_utc, now);
  if (age === null || age > 60)
    return {
      label: "观测延迟",
      tone: "warn",
      detail: `最近观测：${ageLabel(snapshot.netatmo.collector.last_observation_utc, now)}`,
    };
  return {
    label: "持续采集中",
    tone: "good",
    detail: `最近观测：${ageLabel(snapshot.netatmo.collector.last_observation_utc, now)}`,
  };
}

export function backupHealth(snapshot: HubSnapshot | null, now = Date.now()): HubHealth {
  if (!snapshot) return { label: "等待同步", tone: "muted", detail: "尚无 NAS 回执" };
  const { backup, backup_attempt: attempt } = snapshot.netatmo;
  const detail = `最近成功：${ageLabel(backup?.completed_utc, now)}`;
  if (snapshotIsStale(snapshot, now)) return { label: "待核对", tone: "warn", detail };
  if (attempt?.state && !["SUCCESS", "RUNNING"].includes(attempt.state))
    return { label: "最近备份失败", tone: "bad", detail };
  const age = ageMinutes(backup?.completed_utc, now);
  if (age === null) return { label: "暂无成功回执", tone: "warn", detail: "需要核对 NAS 备份" };
  if (age > 90) return { label: "备份延迟", tone: "warn", detail };
  return { label: attempt?.state === "RUNNING" ? "正在备份" : "备份正常", tone: "good", detail };
}

export function latestRecords(records: HubRecord[]): HubRecord[] {
  // ES2022 target: sort a copy to preserve shared snapshot order.
  // oxlint-disable-next-line unicorn/no-array-sort
  return [...records]
    .sort((a, b) => b.end.localeCompare(a.end) || b.start.localeCompare(a.start))
    .slice(0, 5);
}

export function completionPercent(completed: number, total: number): number | null {
  return total > 0 ? Math.round((completed / total) * 100) : null;
}

export function eventTime(value?: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "暂无记录";
  return new Date(value).toLocaleString("zh-CN", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export const priorityLabels: Record<string, string> = {
  urgent: "紧急",
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
  none: "未设优先级",
};
const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };
export function projectStatus(p: HubSummary["plane"]["portfolio"][number]): string {
  if (
    (p.in_progress ?? 0) > 0 ||
    (p.next?.state__group === "started" && p.next.state__name !== "等待反馈")
  )
    return "进行中";
  if ((p.waiting_feedback ?? 0) > 0 || p.next?.state__name === "等待反馈") return "等待反馈";
  return p.open ? "待办" : p.completed ? "已录入事项完成" : "暂无任务";
}
export function featuredProjects(
  projects: HubSummary["plane"]["portfolio"],
  records: HubRecord[],
  today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }),
) {
  const recent = new Map<string, string>();
  for (const record of records) {
    if (record.end > (recent.get(record.project) ?? "")) recent.set(record.project, record.end);
  }
  const overdue = (p: (typeof projects)[number]) =>
    Boolean(p.open && p.next?.target_date && p.next.target_date < today);
  // oxlint-disable-next-line unicorn/no-array-sort
  return projects
    .filter((p) => p.open + p.completed > 0)
    .sort(
      (a, b) =>
        Number(Boolean(b.open)) - Number(Boolean(a.open)) ||
        Number(overdue(b)) - Number(overdue(a)) ||
        (priorityRank[a.priority ?? "none"] ?? 4) - (priorityRank[b.priority ?? "none"] ?? 4) ||
        Number(projectStatus(b) === "进行中") - Number(projectStatus(a) === "进行中") ||
        (a.next?.target_date ?? "9999").localeCompare(b.next?.target_date ?? "9999") ||
        (recent.get(b.name) ?? "").localeCompare(recent.get(a.name) ?? "") ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 4);
}

export function nativeViewUrl(
  workspaceSlug: string,
  project: { id: string; views?: { kanban?: string; gantt?: string } },
  layout: "kanban" | "gantt",
): string {
  const viewId = project.views?.[layout];
  return viewId
    ? `/${workspaceSlug}/projects/${project.id}/views/${viewId}/`
    : `/${workspaceSlug}/projects/${project.id}/issues/`;
}
export function formatCount(value?: number): string {
  return value === undefined ? "暂无记录" : value.toLocaleString("zh-CN");
}

export function capacityPercent(used?: number, total?: number): number | null {
  if (
    used === undefined ||
    total === undefined ||
    !Number.isFinite(used) ||
    !Number.isFinite(total) ||
    used < 0 ||
    total <= 0
  )
    return null;
  return (used / total) * 100;
}
export function capacityIsStale(value?: string, maxAge = 1440, now = Date.now()): boolean {
  const age = ageMinutes(value, now);
  return age === null || age > maxAge;
}
