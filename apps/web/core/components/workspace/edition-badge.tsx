/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import packageJson from "package.json";

export function WorkspaceEditionBadge() {
  return (
    <span
      className="inline-flex px-3 py-2 text-12 text-tertiary"
      title={`Community v${packageJson.version} · AGPL-3.0`}
    >
      Community · 自托管
    </span>
  );
}
