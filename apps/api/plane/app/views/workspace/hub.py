"""Read-only home summary, using the existing workspace membership boundary."""
import json
import os
from pathlib import Path

from django.db.models import Count, Q, F
from django.utils import timezone
from rest_framework.response import Response

from plane.app.permissions import ROLE, allow_permission
from plane.app.views.base import BaseAPIView
from plane.db.models import Issue, Project, ProjectMember


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
        in_progress=Count("id", filter=Q(state__group="started")),
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
        return Response({
            "snapshot": document.get("snapshot"),
            "snapshot_error": error,
            "work_records": document.get("work_records", []),
            "work_records_updated_at": document.get("work_records_updated_at"),
            "workdesk_url": document.get("workdesk_url"),
            "plane": {"projects": projects.count(), **stats, "todos": todos, "project_progress": project_progress},
        }, headers={"Cache-Control": "private, no-store"})
