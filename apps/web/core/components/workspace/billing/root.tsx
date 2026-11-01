/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { SettingsBoxedControlItem } from "@/components/settings/boxed-control-item";
import { SettingsHeading } from "@/components/settings/heading";

export function BillingRoot() {
  return (
    <section>
      <SettingsHeading
        title="Community · 自托管"
        description="此实例使用免费开源社区版，无需订阅。"
      />
      <div className="mt-6">
        <SettingsBoxedControlItem
          title="AGPL-3.0"
          description="项目、工作项、看板、时间轴与 Pages 使用社区版；Hub 功能在开源代码上维护。"
        />
      </div>
    </section>
  );
}
