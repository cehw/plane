"""Read-only home summary, using the existing workspace membership boundary."""
import json
import os
from pathlib import Path

from django.db.models import Count, Q, F
from django.utils import timezone
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.app.views.base import BaseAPIView
from plane.db.models import Issue, Project, ProjectMember, IssueView


def load_snapshot(slug):
    path = Path(os.environ.get("HUB_SNAPSHOT_DIR", "/code/hub-data")) / f"{slug}.json"
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except FileNotFoundError:
        return {}, "还没有同步的数据快照。"
    except (OSError, ValueError):
        return {}, "数据快照暂时无法读取，请检查同步任务。"


OPEN_GROUPS = ["backlog", "unstarted", "started"]


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
        stats = task_summary(issues)
        todos = list(issues.filter(state__group__in=OPEN_GROUPS).order_by(
            F("target_date").asc(nulls_last=True), "created_at", "id"
        ).values("id", "name", "project_id", "project__identifier", "sequence_id",
                 "state__name", "state__group", "priority", "target_date")[:8])
        project_progress = list(issues.values("project_id", "project__name").annotate(
            open=Count("id", filter=Q(state__group__in=OPEN_GROUPS)),
            completed=Count("id", filter=Q(state__group="completed")),
        ).order_by("project__name", "project_id"))
        progress_by_id = {str(item["project_id"]): item for item in project_progress}
        next_by_project = {}
        for item in issues.filter(state__group__in=OPEN_GROUPS).order_by(F("target_date").asc(nulls_last=True), "created_at", "id").values("id", "name", "project_id", "state__name", "state__group"):
            next_by_project.setdefault(str(item["project_id"]), item)
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
                              "views": views_by_project.get(str(project.id), {}),
                              "dated": dated_by_project.get(str(project.id), 0),
                              "undated": counts["open"] + counts["completed"] - dated_by_project.get(str(project.id), 0),
                              "next": next_by_project.get(str(project.id))})
        portfolio.sort(key=lambda p: (not (p["next"] and p["next"]["state__group"] == "started"), not p["open"], p["name"]))
        return Response({
            "snapshot": document.get("snapshot"),
            "snapshot_error": error,
            "work_records": document.get("work_records", []),
            "work_records_updated_at": document.get("work_records_updated_at"),
            "workdesk_url": document.get("workdesk_url"),
            "plane": {"projects": projects.count(), **stats, "todos": todos, "project_progress": project_progress, "portfolio": portfolio},
        }, headers={"Cache-Control": "private, no-store"})
