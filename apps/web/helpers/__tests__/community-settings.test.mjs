/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { isCommunityWorkspaceSetting } from "../community-settings.ts";

test("community settings omit billing without removing operational settings", () => {
  const keys = ["general", "members", "billing-and-plans", "webhooks", "export"];
  assert.deepEqual(keys.map(key => ({key})).filter(isCommunityWorkspaceSetting).map(item => item.key),
    ["general", "members", "webhooks", "export"]);
});
