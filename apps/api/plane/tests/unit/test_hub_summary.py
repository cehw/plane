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
from plane.app.views.workspace.hub import HubSummaryEndpoint, load_snapshot


class HubSummaryTests(unittest.TestCase):
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
