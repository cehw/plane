export type TimelineDates = { start_date?: string | null; target_date?: string | null };
export function timelineDateLabel(issue: TimelineDates) {
  if (issue.start_date && issue.target_date) return `${issue.start_date} → ${issue.target_date}`;
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
  // Keep a current period visible when it intersects today; otherwise locate the most recent real date.
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
