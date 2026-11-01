from datetime import date, datetime
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "plane.settings.production")
import django
django.setup()

import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from rest_framework.test import APIRequestFactory, force_authenticate
from plane.app.views.workspace.hub import HubSummaryEndpoint, load_snapshot, task_order, enrich_work_records


class HubSummaryTests(unittest.TestCase):
    def test_history_retains_dates_kind_and_scope_and_links_renamed_project(self):
        record = dict(id="old-1", project="Original", title="Observation", kind="进行中",
                      start="2026-03-04", end="2026-03-08", siteScope="Site A", detail="Original notes")
        projects = [dict(id="project-1", name="Renamed", external_id="Original",
                         external_source="workdesk-2026-11")]
        issues = [dict(id="issue-1", project_id="project-1", external_id="history:old-1")]
        pages = [dict(page_id="page-1", project_id="project-1", page__external_id="history:Original")]
        result = enrich_work_records([record, dict(record)], projects, issues, pages)
        self.assertEqual(result, [{**record, "project_id": "project-1", "issue_id": "issue-1", "page_id": "page-1"}])
        self.assertNotIn("project_id", record)

    def test_history_omits_inaccessible_projects_and_never_cross_links_projects(self):
        records = [dict(id="old-1", project="Visible", title="Known", kind="计划", start="", end=""),
                   dict(id="private", project="Private", title="Hidden", kind="已做", start="", end="")]
        projects = [dict(id="project-1", name="Visible", external_id=None, external_source=None)]
        issues = [dict(id="wrong-issue", project_id="project-2", external_id="history:old-1")]
        pages = [dict(page_id="wrong-page", project_id="project-2", page__external_id="history:Visible")]
        self.assertEqual(enrich_work_records(records, projects, issues, pages),
                         [{**records[0], "project_id": "project-1"}])

    def test_history_uses_native_name_when_no_migration_alias_exists(self):
        record = dict(id="new-1", project="Native", title="Report", kind="汇报",
                      start="2026-10-31", end="2026-10-31")
        projects = [dict(id="project-1", name="Native", external_id="Unrelated", external_source="another-import")]
        self.assertEqual(enrich_work_records([record], projects, [], []),
                         [{**record, "project_id": "project-1"}])

    def test_next_action_prioritizes_overdue_priority_and_active_work(self):
        today = date(2026, 11, 1)
        def item(id, priority, group="unstarted", due=None, name="待办"):
            return dict(id=id, priority=priority, state__group=group, state__name=name,
                        target_date=due, created_at=datetime(2026, 10, 1))
        rows = [item("low", "low"), item("high", "high"), item("urgent", "urgent"),
                item("late", "low", due=date(2026, 10, 30)), item("active", "high", "started"),
                item("waiting", "high", "started", name="等待反馈")]
        self.assertEqual([r["id"] for r in sorted(rows, key=lambda r: task_order(r, today))],
                         ["late", "urgent", "active", "high", "waiting", "low"])
        self.assertIsNone(rows[0]["target_date"])

    def test_missing_snapshot_does_not_fabricate_healthy_data(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {"HUB_SNAPSHOT_DIR":folder}):
            data,error=load_snapshot("test-workspace")
            self.assertEqual(data,{})
            self.assertTrue(error)

    def test_snapshot_is_workspace_specific(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {"HUB_SNAPSHOT_DIR":folder}):
            Path(folder,"one.json").write_text(json.dumps({"snapshot":{"generated_at":"2026-11-01T08:00:00Z"}}))
            self.assertIsNone(load_snapshot("one")[1])
            self.assertTrue(load_snapshot("two")[1])

    def test_corrupt_snapshot_shows_error(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {"HUB_SNAPSHOT_DIR":folder}):
            Path(folder,"one.json").write_text("incomplete-json")
            self.assertTrue(load_snapshot("one")[1])

    def test_anonymous_request_cannot_read_snapshot(self):
        request=APIRequestFactory().get('/api/workspaces/one/hub-summary/')
        with patch('plane.app.views.workspace.hub.load_snapshot') as loader:
            response=HubSummaryEndpoint.as_view()(request,slug='one')
            self.assertIn(response.status_code,(401,403))
            loader.assert_not_called()

    def test_authenticated_nonmember_cannot_read_snapshot(self):
        request=APIRequestFactory().get('/api/workspaces/one/hub-summary/')
        force_authenticate(request,user=SimpleNamespace(is_authenticated=True,user_timezone='Asia/Hong_Kong'))
        with patch('plane.app.permissions.base.WorkspaceMember.objects.filter') as membership, patch('plane.app.views.workspace.hub.load_snapshot') as loader:
            membership.return_value.exists.return_value=False
            response=HubSummaryEndpoint.as_view()(request,slug='one')
            self.assertEqual(response.status_code,403)
            loader.assert_not_called()


if __name__=='__main__':
    unittest.main()
