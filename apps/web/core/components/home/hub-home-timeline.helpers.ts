import {
  RESEARCH_PROJECT_GROUPS as researchGroups,
  PERSONAL_PROJECTS as personalProjects,
  STELLERUS_PROJECTS as stellerusProjects,
} from "../project/project-scopes";

export type TimelineDates = { start_date?: string | null; target_date?: string | null };
export function timelineDateLabel(issue: TimelineDates) {
  if (issue.start_date && issue.target_date)
    return issue.start_date === issue.target_date
      ? issue.start_date
      : `${issue.start_date} → ${issue.target_date}`;
  if (issue.start_date) return `仅开始 ${issue.start_date}`;
  if (issue.target_date) return `仅截止 ${issue.target_date}`;
  return "未定日期";
}
export function prepareTimelineItems<T extends TimelineDates & { id: string; name: string }>(
  items: T[],
) {
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  const dated = unique
    .filter((item) => item.start_date || item.target_date)
    .sort(
      (a, b) =>
        (b.target_date ?? b.start_date ?? "").localeCompare(a.target_date ?? a.start_date ?? "") ||
        a.name.localeCompare(b.name),
    );
  return { dated, undated: unique.filter((item) => !item.start_date && !item.target_date) };
}
export function timelineInitialDate(items: TimelineDates[], today: string) {
  const dates = items
    .flatMap((item) => [item.start_date, item.target_date])
    .filter((date): date is string => !!date)
    .sort();
  if (!dates.length) return undefined;
  if (
    items.some(
      (item) =>
        item.start_date &&
        item.target_date &&
        item.start_date <= today &&
        item.target_date >= today,
    )
  )
    return today;
  return dates.filter((date) => date <= today).at(-1) ?? dates[0];
}

type SourceRecord = {
  id: string;
  project: string;
  title: string;
  kind: string;
  start: string;
  end: string;
  siteScope?: string;
  detail?: string;
  project_id?: string;
  issue_id?: string;
  page_id?: string;
};
type SourceIssue = TimelineDates & {
  id: string;
  name: string;
  project_id: string | null;
  completed_at?: string | null;
  state__group?: string | null;
};
type SourceProject = { id: string; name: string };
export type TimelineEntry = TimelineDates & {
  id: string;
  name: string;
  project: string;
  project_id: string;
  kind: string;
  detail?: string;
  siteScope?: string;
  issue_id?: string;
  page_id?: string;
  origin: "record" | "issue";
};
export type TimelineRow = {
  id: string;
  name: string;
  sort_order: number;
  start_date: string | null;
  target_date: string | null;
  level: number;
  type: "category" | "lane" | "entry";
  entries: TimelineEntry[];
};
export type TimelineNode = TimelineRow & { children: TimelineNode[] };

export function buildTimelineEntries(
  records: SourceRecord[],
  issues: SourceIssue[],
  projects: SourceProject[],
) {
  const visible = new Map(projects.map((project) => [project.id, project]));
  const byName = new Map(projects.map((project) => [project.name, project]));
  const mappedIssueIds = new Set<string>();
  const entries: TimelineEntry[] = [];
  for (const record of new Map(records.map((record) => [record.id, record])).values()) {
    const project = record.project_id ? visible.get(record.project_id) : byName.get(record.project);
    if (!project) continue;
    if (record.issue_id) mappedIssueIds.add(record.issue_id);
    entries.push({
      id: `record:${record.id}`,
      name: record.title,
      project: record.project,
      project_id: project.id,
      kind: record.kind,
      start_date: record.start || null,
      target_date: record.end || null,
      siteScope: record.siteScope,
      detail: record.detail,
      issue_id: record.issue_id,
      page_id: record.page_id,
      origin: "record",
    });
  }
  for (const issue of new Map(issues.map((issue) => [issue.id, issue])).values()) {
    const project = issue.project_id ? visible.get(issue.project_id) : undefined;
    if (!project || mappedIssueIds.has(issue.id)) continue;
    entries.push({
      id: `issue:${issue.id}`,
      name: issue.name,
      project: project.name,
      project_id: project.id,
      issue_id: issue.id,
      kind:
        issue.completed_at || issue.state__group === "completed"
          ? "已做"
          : issue.state__group === "started"
            ? "进行中"
            : ["backlog", "unstarted"].includes(issue.state__group ?? "")
              ? "计划"
              : "原生事项",
      start_date: issue.start_date,
      target_date: issue.target_date,
      origin: "issue",
    });
  }
  return prepareTimelineItems(entries);
}

export function timelineEntryHref(workspaceSlug: string, entry: TimelineEntry) {
  const project = `/${workspaceSlug}/projects/${entry.project_id}`;
  if (entry.issue_id) return `${project}/issues/${entry.issue_id}/`;
  if (entry.page_id) return `${project}/pages/${entry.page_id}/`;
  return `${project}/issues/`;
}

const siteCatalog = [
  "HK-CLP Ta",
  "Jiangsu wind multiple",
  "阿克塞（当金山）",
  "香港 Noul",
  "综合汇报",
];
function laneName(entry: TimelineEntry) {
  return stellerusProjects.includes(entry.project)
    ? entry.siteScope ||
        (entry.project === "Stellerus CLP"
          ? "HK-CLP Ta"
          : entry.project === "WRF / LAE"
            ? "香港 Noul"
            : "综合 / 待归类")
    : entry.project;
}
function makeNode(
  id: string,
  name: string,
  type: TimelineRow["type"],
  level: number,
  entries: TimelineEntry[],
  children: TimelineNode[] = [],
): TimelineNode {
  const dates = entries
    .flatMap((entry) => [entry.start_date, entry.target_date])
    .filter((date): date is string => !!date)
    .sort();
  // These are display bounds only. Actual source dates remain on entries and are never written back.
  const entry = type === "entry" ? entries[0] : undefined;
  return {
    id,
    name,
    type,
    level,
    entries,
    children,
    sort_order: 0,
    start_date: entry ? (entry.start_date ?? null) : (dates[0] ?? null),
    target_date: entry ? (entry.target_date ?? null) : (dates.at(-1) ?? null),
  };
}
function lanes(entries: TimelineEntry[], names: string[], prefix: string, level: number) {
  return names.flatMap((name) => {
    const matching = entries.filter((entry) => laneName(entry) === name);
    return matching.length
      ? [
          makeNode(
            `lane:${prefix}:${name}`,
            name,
            "lane",
            level,
            matching,
            matching.map((entry) => makeNode(entry.id, entry.name, "entry", level + 1, [entry])),
          ),
        ]
      : [];
  });
}
export function buildTimelineTree(entries: TimelineEntry[]): TimelineNode[] {
  const researchNames = researchGroups.flatMap((group) => group.projects);
  const researchEntries = entries.filter((entry) => researchNames.includes(entry.project));
  const stellerusEntries = entries.filter((entry) => stellerusProjects.includes(entry.project));
  const personalEntries = entries.filter((entry) => personalProjects.includes(entry.project));
  const otherEntries = entries.filter(
    (entry) =>
      ![...researchNames, ...stellerusProjects, ...personalProjects].includes(entry.project),
  );
  const tree: TimelineNode[] = [];
  if (researchEntries.length)
    tree.push(
      makeNode(
        "category:research",
        "科研",
        "category",
        0,
        researchEntries,
        researchGroups.flatMap((group) => {
          const matching = researchEntries.filter((entry) =>
            group.projects.includes(entry.project),
          );
          return matching.length
            ? [
                makeNode(
                  `category:${group.id}`,
                  group.name,
                  "category",
                  1,
                  matching,
                  lanes(matching, group.projects, group.id, 2),
                ),
              ]
            : [];
        }),
      ),
    );
  if (stellerusEntries.length)
    tree.push(
      makeNode(
        "category:stellerus",
        "Stellerus",
        "category",
        0,
        stellerusEntries,
        lanes(
          stellerusEntries,
          [...new Set([...siteCatalog, ...stellerusEntries.map(laneName)])],
          "stellerus",
          1,
        ),
      ),
    );
  if (personalEntries.length)
    tree.push(
      makeNode(
        "category:personal",
        "Personal",
        "category",
        0,
        personalEntries,
        lanes(personalEntries, personalProjects, "personal", 1),
      ),
    );
  if (otherEntries.length)
    tree.push(
      makeNode(
        "category:other",
        "待归类",
        "category",
        0,
        otherEntries,
        lanes(otherEntries, [...new Set(otherEntries.map((entry) => entry.project))], "other", 1),
      ),
    );
  return tree;
}
export function flattenTimelineTree(
  tree: TimelineNode[],
  expanded: ReadonlySet<string>,
): TimelineRow[] {
  const rows: TimelineRow[] = [];
  function visit(node: TimelineNode) {
    rows.push({ ...node, sort_order: rows.length });
    if (expanded.has(node.id)) node.children.forEach(visit);
  }
  tree.forEach(visit);
  return rows;
}

const day = 86400000;
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / day;
const dateFromDay = (value: number) => new Date(value * day).toISOString().slice(0, 10);
export const timelineKinds = ["已做", "进行中", "计划", "汇报"];
export type TimelineSegment = {
  key: string;
  kind: string;
  start: string;
  end: string;
  left: number;
  width: number;
  entries: TimelineEntry[];
};
export function timelineSummarySegments(row: TimelineRow): TimelineSegment[] {
  if (!row.start_date || !row.target_date) return [];
  const ranges = row.entries.flatMap((entry) => {
    const first = entry.start_date ?? entry.target_date;
    const last = entry.target_date ?? entry.start_date;
    return first && last ? [{ entry, start: dayNumber(first), end: dayNumber(last) + 1 }] : [];
  });
  const boundaries = [...new Set(ranges.flatMap((range) => [range.start, range.end]))].sort(
    (a, b) => a - b,
  );
  const start = dayNumber(row.start_date),
    span = dayNumber(row.target_date) - start + 1;
  const segments: TimelineSegment[] = [];
  // Split at actual observation dates; gaps stay empty and coincident records remain selectable.
  for (let i = 0; i < boundaries.length - 1; i++) {
    const left = boundaries[i],
      right = boundaries[i + 1];
    const active = ranges.filter((range) => range.start < right && range.end > left);
    for (const kind of new Set(active.map((range) => range.entry.kind))) {
      const matching = active
        .filter((range) => range.entry.kind === kind)
        .map((range) => range.entry);
      segments.push({
        key: `${left}:${kind}`,
        kind,
        start: dateFromDay(left),
        end: dateFromDay(right - 1),
        left: ((left - start) / span) * 100,
        width: ((right - left) / span) * 100,
        entries: matching,
      });
    }
  }
  return segments;
}
