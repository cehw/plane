/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { ContentWrapper } from "@plane/ui";

export function WorkspaceActiveCyclesUpgrade() {
  const { workspaceSlug } = useParams();
  return (
    <ContentWrapper>
      <div className="space-y-3 p-6">
        <h2 className="text-20 font-semibold">跨项目周期总览</h2>
        <p className="text-14 text-secondary">
          当前社区版未提供此总览。可以进入各项目查看和管理 Cycles。
        </p>
        <Link
          className="text-13 text-accent-primary hover:underline"
          href={`/${workspaceSlug}/projects/`}
        >
          查看项目
        </Link>
      </div>
    </ContentWrapper>
  );
}
