/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// Used by both settings navigation and command search in this community fork.
export function isCommunityWorkspaceSetting(item: { key: string }): boolean {
  return item.key !== "billing-and-plans";
}
