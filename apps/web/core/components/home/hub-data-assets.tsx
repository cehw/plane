import { HubAppearanceSwitch } from "@/components/appearance/hub-appearance-switch";
import { ShieldCheck, RefreshCw } from "lucide-react";
import useSWR from "swr";
import { Card } from "@plane/propel/card";
import { Badge } from "@plane/propel/badge";
import { Button } from "@plane/propel/button";
import { Tabs } from "@plane/propel/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@plane/propel/table";
import { HubSummaryService } from "@/services/hub-summary.service";
import { eventTime, backupHealth, snapshotIsStale, formatCount } from "./hub-summary.helpers";
import { NasCapacity, NasVolumeCapacity } from "./hub-nas-capacity";
import { HubOnlineCollection } from "./hub-online-collection";
import { HubCoverage } from "./hub-coverage";

const service = new HubSummaryService();
function Stamp({ value }: { value?: string }) {
  return (
    <>
      {value && Number.isFinite(Date.parse(value))
        ? new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Taipei", hour12: false })
        : "暂无记录"}
    </>
  );
}
export function HubDataAssets({ workspaceSlug }: { workspaceSlug: string }) {
  const { data, error, isValidating, mutate } = useSWR(
    `hub-data-assets:${workspaceSlug}`,
    () => service.getSummary(workspaceSlug),
    { refreshInterval: 60000 },
  );
  const s = data?.snapshot;
  if (!s)
    return (
      <div className="p-6 text-secondary" role="status">
        {error || data?.snapshot_error ? "数据状态暂时无法读取" : "正在读取数据资产…"}
        <Button variant="secondary" size="sm" onClick={() => void mutate()}>
          重试
        </Button>
      </div>
    );
  const a = s.netatmo;
  const b = backupHealth(s);
  const stale = snapshotIsStale(s);
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-24 font-semibold text-primary">数据资产</h1>
          <p className="mt-1 text-13 text-tertiary">
            在线采集 · Climet3 数据与计算 · HD6500 NAS 备份
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <HubAppearanceSwitch />
          <Button
            variant="secondary"
            size="sm"
            prependIcon={<RefreshCw />}
            disabled={isValidating}
            onClick={() => void mutate()}
          >
            刷新状态
          </Button>
        </div>
      </div>
      <p className="text-11 text-tertiary" title={`接收：${s.received_at ?? "暂无记录"}（UTC+8）`}>
        状态更新：
        <Stamp value={s.generated_at} />
        （UTC+8）
      </p>
      {(stale || error) && (
        <Card className="min-w-0 gap-3 p-4 shadow-none">
          <p role="status" className="text-13 text-warning-primary">
            {stale
              ? "快照已过期，下面保留最后已知状态，不能据此确认当前采集和备份正常。"
              : "最新刷新失败，下面保留上次成功读取的状态。"}
          </p>
        </Card>
      )}
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <HubOnlineCollection snapshot={s} />
        <aside aria-label="备份与完整性" className="space-y-4">
          <Card className="gap-0 p-4 shadow-none">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-16 font-semibold">
                <ShieldCheck size={18} />
                NAS · 备份与存储
              </h2>
              <Badge
                variant={b.tone === "good" ? "success" : b.tone === "bad" ? "danger" : "warning"}
              >
                {b.label}
              </Badge>
            </div>
            <p className="mt-2 text-13 text-secondary">
              最近完成{" "}
              <time className="ml-2 font-medium tabular-nums text-primary">
                {eventTime(a.backup?.completed_utc)}
              </time>
            </p>
            {b.tone !== "good" && <p className="mt-1 text-12 text-warning-primary">{b.detail}</p>}
            <NasCapacity share={a.nas_share} />
            <details className="mt-3 border-t border-subtle pt-3 text-12">
              <summary className="cursor-pointer text-secondary">查看 NAS 卷整体容量</summary>
              <NasVolumeCapacity volume={a.nas_volume} />
            </details>
          </Card>
          <div className="rounded-lg border border-subtle bg-surface-1 p-4">
            <h2 className="mb-2 text-13 font-semibold">数据完整性</h2>
            <p
              className={`text-12 leading-relaxed ${a.archive.known_gap ? "text-warning-primary" : "text-secondary"}`}
            >
              {a.archive.known_gap ?? "暂无已记录缺口"}
            </p>
            <p className="mt-2 text-11 text-tertiary">备份保存已有观测，不会补回历史缺口。</p>
          </div>
        </aside>
      </div>
      <Tabs defaultValue="assets">
        <Tabs.List>
          <Tabs.Trigger value="assets">数据总览</Tabs.Trigger>
          <Tabs.Trigger value="backup">备份与恢复</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="assets" className="space-y-5 pt-5">
          <HubCoverage snapshot={s} />
          <details className="rounded-xl border border-subtle bg-surface-1 p-4">
            <summary className="cursor-pointer text-14 font-semibold">数据清单与保存策略</summary>
            <div className="mt-3 overflow-x-auto">
              <Table className="min-w-[650px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>数据资产</TableHead>
                    <TableHead>保存优先级</TableHead>
                    <TableHead>现有规模</TableHead>
                    <TableHead>存储与状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Netatmo 历史 CSV</TableCell>
                    <TableCell>
                      <Badge variant="warning">关键 · 不可重新抓取</Badge>
                    </TableCell>
                    <TableCell>
                      {formatCount(a.archive.csv_files)} 文件 · {(a.archive.bytes / 1e9).toFixed(2)}{" "}
                      GB
                    </TableCell>
                    <TableCell>Climet3 → HD6500 NAS</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Netatmo 全球新采集</TableCell>
                    <TableCell>
                      <Badge variant="warning">关键 · 长期保留</Badge>
                    </TableCell>
                    <TableCell>{formatCount(a.recent_stations)} 站 / 近 24 小时</TableCell>
                    <TableCell>SQLite 观测、查询队列与站点目录</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>采集代码与去密配置</TableCell>
                    <TableCell>
                      <Badge variant="brand">关键 · 可恢复运行</Badge>
                    </TableCell>
                    <TableCell>随关键采集备份</TableCell>
                    <TableCell>恢复采集时需要重新授权凭据</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>HRES</TableCell>
                    <TableCell>
                      <Badge>可重建</Badge>
                    </TableCell>
                    <TableCell>尚未接入实时下载监控</TableCell>
                    <TableCell>
                      {s.hres?.policy ?? "优先保留下载脚本与配置；原始文件可重新下载"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </details>
        </Tabs.Content>
        <Tabs.Content
          value="backup"
          className="grid items-start gap-4 pt-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]"
        >
          <Card className="min-w-0 gap-3 p-4 shadow-none">
            <div className="flex items-center justify-between">
              <h2 className="text-16 font-semibold">NAS 备份回执</h2>
              <Badge
                variant={b.tone === "good" ? "success" : b.tone === "bad" ? "danger" : "warning"}
              >
                {b.label}
              </Badge>
            </div>
            <Table className="table-fixed [&_td:first-child]:w-28 [&_td]:align-top [&_td]:break-words">
              <TableBody>
                <TableRow>
                  <TableCell>最近成功完成</TableCell>
                  <TableCell>
                    <Stamp value={a.backup?.completed_utc} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>数据快照截点</TableCell>
                  <TableCell>
                    <Stamp value={a.backup?.snapshot_cutoff_utc} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>最近尝试</TableCell>
                  <TableCell>
                    {a.backup_attempt?.state ?? "未记录"} ·{" "}
                    <Stamp value={a.backup_attempt?.started_utc} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>目的位置</TableCell>
                  <TableCell>{a.backup?.destination ?? "尚无回执"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>既定频率 / 保留方式</TableCell>
                  <TableCell>每小时第 05 分钟 · 增量复制并保留旧版本</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
          <Card className="min-w-0 gap-3 p-4 shadow-none">
            <h2 className="text-16 font-semibold">独立恢复验证</h2>
            <p className="text-13">
              <Stamp value={a.restore_test?.tested_at} /> · {a.restore_test?.result ?? "尚无记录"}
            </p>
            <p className="text-13 text-secondary">
              CSV {formatCount(a.restore_test?.csv_rows)} 行 · SQLite{" "}
              {formatCount(a.restore_test?.sqlite_rows)} 行
            </p>
            <p className="text-12 text-tertiary">
              这是记录日期的一次抽样恢复验证，不代表每小时完整恢复。API
              凭据不在备份中，恢复采集需重新授权。
            </p>
          </Card>
        </Tabs.Content>
      </Tabs>
      <p className="text-11 text-tertiary">
        页面每分钟读取最后快照。本机离线可能导致展示过期；Climet3 采集和 NAS 备份独立运行。
      </p>
    </div>
  );
}
