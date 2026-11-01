"""Read-only home summary, using the existing workspace membership boundary."""
import json
import os
from pathlib import Path

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.app.views.base import BaseAPIView
from plane.db.models import Issue, Project, ProjectMember, IssueView, Page, ProjectPage


def load_snapshot(slug):
    path = Path(os.environ.get("HUB_SNAPSHOT_DIR", "/code/hub-data")) / f"{slug}.json"
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except FileNotFoundError:
        return {}, "还没有同步的数据快照。"
    except (OSError, ValueError):
        return {}, "数据快照暂时无法读取，请检查同步任务。"


OPEN_GROUPS = ["backlog", "unstarted", "started"]
PRIORITY_ORDER = {"urgent": 0, "high": 1, "medium": 2, "low": 3, "none": 4}


def task_order(item, today):
    due = item.get("target_date")
    active = item.get("state__group") == "started" and item.get("state__name") != "等待反馈"
    return (not (due and due < today), PRIORITY_ORDER.get(item.get("priority"), 4),
            not active, due is None, due or today, item["created_at"], str(item["id"]))


def task_summary(issues):
    counts = issues.aggregate(
        open=Count("id", filter=Q(state__group__in=OPEN_GROUPS)),
        completed=Count("id", filter=Q(state__group="completed")),
        in_progress=Count("id", filter=Q(state__group="started") & ~Q(state__name="等待反馈")),
        waiting_feedback=Count("id", filter=Q(state__name="等待反馈")),
        overdue=Count("id", filter=Q(state__group__in=OPEN_GROUPS, target_date__lt=timezone.localdate())),
    )
    counts["total"] = counts["open"] + counts["completed"]
    return counts


def enrich_work_records(records, projects, history_issues, history_pages):
    """Link original workdesk dates to visible native objects without changing history."""
    projects = list(projects)
    by_name = {project["name"]: str(project["id"]) for project in projects}
    # The migration source name survives a later rename of the native project.
    by_name.update({project["external_id"]: str(project["id"]) for project in projects
                    if project.get("external_source") == "workdesk-2026-11" and project.get("external_id")})
    issue_ids = {(str(row["project_id"]), row["external_id"]): str(row["id"])
                 for row in history_issues}
    page_ids = {(str(row["project_id"]), row["page__external_id"]): str(row["page_id"])
                for row in history_pages}
    fields = ("id", "project", "title", "kind", "start", "end", "siteScope", "detail")
    seen = set()
    result = []
    for record in records:
        project_id = by_name.get(record["project"])
        if not project_id or record["id"] in seen:
            continue
        seen.add(record["id"])
        item = {key: record[key] for key in fields if key in record}
        item["project_id"] = project_id
        issue_id = issue_ids.get((project_id, "history:" + record["id"]))
        page_id = page_ids.get((project_id, "history:" + record["project"]))
        if issue_id:
            item["issue_id"] = issue_id
        if page_id:
            item["page_id"] = page_id
        result.append(item)
    return result


class HubSummaryEndpoint(BaseAPIView):
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER], level="WORKSPACE")
    def get(self, request, slug):
        document, error = load_snapshot(slug)
        memberships = ProjectMember.objects.filter(
            workspace__slug=slug, member=request.user, is_active=True
        ).values_list("project_id", flat=True)
        projects = Project.objects.filter(workspace__slug=slug, archived_at__isnull=True).filter(
            Q(network=2) | Q(id__in=memberships)
        )
        issues = Issue.issue_objects.filter(project__in=projects)
        # Pages use 0 for shared access, unlike IssueView. Match the native
        # Pages membership and ownership boundary before exposing a deep link.
        history_pages = ProjectPage.objects.filter(
            project__in=projects, project_id__in=memberships, deleted_at__isnull=True,
            page__workspace__slug=slug, page__deleted_at__isnull=True,
            page__archived_at__isnull=True, page__parent__isnull=True,
            page__external_source="workdesk-2026-11",
        ).filter(Q(page__owned_by=request.user) | Q(page__access=Page.PUBLIC_ACCESS)).values(
            "project_id", "page_id", "page__external_id"
        )
        work_records = enrich_work_records(
            document.get("work_records", []),
            projects.values("id", "name", "external_id", "external_source"),
            issues.filter(external_source="workdesk-history").values("id", "project_id", "external_id"),
            history_pages,
        )
        stats = task_summary(issues)
        open_tasks = list(issues.filter(state__group__in=OPEN_GROUPS).values(
            "id", "name", "project_id", "project__identifier", "sequence_id", "state__name",
            "state__group", "priority", "target_date", "created_at"))
        open_tasks.sort(key=lambda item: task_order(item, timezone.localdate()))
        todos = open_tasks[:8]
        project_progress = list(issues.values("project_id", "project__name").annotate(
            open=Count("id", filter=Q(state__group__in=OPEN_GROUPS)),
            completed=Count("id", filter=Q(state__group="completed")),
            in_progress=Count("id", filter=Q(state__group="started") & ~Q(state__name="等待反馈")),
            waiting_feedback=Count("id", filter=Q(state__name="等待反馈")),
        ).order_by("project__name", "project_id"))
        progress_by_id = {str(item["project_id"]): item for item in project_progress}
        next_by_project = {}
        priority_by_project = {}
        for item in open_tasks:
            project_id = str(item["project_id"])
            next_by_project.setdefault(project_id, item)
            priority = item["priority"]
            if PRIORITY_ORDER.get(priority, 4) < PRIORITY_ORDER.get(priority_by_project.get(project_id), 5):
                priority_by_project[project_id] = priority
        views_by_project = {}
        for view in IssueView.objects.filter(project__in=projects, name__in=["项目看板", "项目时间轴"]).filter(Q(owned_by=request.user) | Q(access=1)):
            layout = view.display_filters.get("layout")
            if layout == "gantt_chart":
                layout = "gantt"
            if layout in ["kanban", "gantt"]:
                views_by_project.setdefault(str(view.project_id), {})[layout] = str(view.id)
        dated_by_project = {str(row["project_id"]): row["dated"] for row in issues.filter(state__group__in=OPEN_GROUPS + ["completed"]).values("project_id").annotate(dated=Count("id", filter=Q(start_date__isnull=False) | Q(target_date__isnull=False)))}
        portfolio = []
        for project in projects.order_by("name"):
            counts = progress_by_id.get(str(project.id), {"open": 0, "completed": 0})
            portfolio.append({"id": str(project.id), "name": project.name, "description": project.description,
                              "open": counts["open"], "completed": counts["completed"],
                              "priority": priority_by_project.get(str(project.id), "none"),
                              "in_progress": counts.get("in_progress", 0),
                              "waiting_feedback": counts.get("waiting_feedback", 0),
                              "views": views_by_project.get(str(project.id), {}),
                              "dated": dated_by_project.get(str(project.id), 0),
                              "undated": counts["open"] + counts["completed"] - dated_by_project.get(str(project.id), 0),
                              "next": next_by_project.get(str(project.id))})
        portfolio.sort(key=lambda p: (not (p["next"] and p["next"]["state__group"] == "started"), not p["open"], p["name"]))
        return Response({
            "snapshot": document.get("snapshot"),
            "snapshot_error": error,
            "work_records": work_records,
            "work_records_updated_at": document.get("work_records_updated_at"),
            "workdesk_url": document.get("workdesk_url"),
            "plane": {"projects": projects.count(), **stats, "todos": todos, "project_progress": project_progress, "portfolio": portfolio},
        }, headers={"Cache-Control": "private, no-store"})
