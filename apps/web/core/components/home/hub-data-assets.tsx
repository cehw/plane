import { ShieldCheck, RefreshCw } from "lucide-react";
import useSWR from "swr";
import { Card } from "@plane/propel/card";
import { Badge } from "@plane/propel/badge";
import { Button } from "@plane/propel/button";
import { Tabs } from "@plane/propel/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@plane/propel/table";
import { HubSummaryService } from "@/services/hub-summary.service";
import {
  ageLabel,
  eventTime,
  backupHealth,
  snapshotIsStale,
  formatCount,
} from "./hub-summary.helpers";
import { Metric } from "./hub-summary";
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
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-24 font-semibold text-primary">数据资产</h1>
          <p className="mt-1 text-13 text-tertiary">
            在线采集 · Climet3 数据与计算 · HD6500 NAS 备份
          </p>
        </div>
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
      <p className="text-12 text-tertiary">
        源状态：
        <Stamp value={s.generated_at} /> · 接收：
        <Stamp value={s.received_at} />
        （UTC+8）
      </p>
      {(stale || error) && (
        <Card>
          <p role="status" className="text-13 text-warning-primary">
            {stale
              ? "快照已过期，下面保留最后已知状态，不能据此确认当前采集和备份正常。"
              : "最新刷新失败，下面保留上次成功读取的状态。"}
          </p>
        </Card>
      )}
      <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
        <HubOnlineCollection snapshot={s} />
        <Metric
          icon={ShieldCheck}
          title="NAS · Netatmo 最近备份"
          value={eventTime(a.backup?.completed_utc)}
          detail={
            b.tone === "good" ? ageLabel(a.backup?.completed_utc) : `${b.label} · ${b.detail}`
          }
          tone={b.tone}
          indicator
        >
          <NasCapacity share={a.nas_share} />
        </Metric>
      </div>
      <Tabs defaultValue="assets">
        <Tabs.List>
          <Tabs.Trigger value="assets">数据总览</Tabs.Trigger>
          <Tabs.Trigger value="backup">备份与恢复</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="assets" className="space-y-5 pt-5">
          <HubCoverage snapshot={s} storage />
          <Table>
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
                  {formatCount(a.archive.csv_files)} 文件 · {(a.archive.bytes / 1e9).toFixed(2)} GB
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
          <div className="space-y-4">
            <Card>
              <h2 className="text-16 font-semibold">采集进度</h2>
              <dl className="grid grid-cols-2 gap-3 text-13">
                <dt className="text-tertiary">近 24 小时模块观测</dt>
                <dd>{formatCount(a.recent_module_observations)}</dd>
                <dt className="text-tertiary">活动查询网格</dt>
                <dd>{formatCount(a.tiles.active)}</dd>
                <dt className="text-tertiary">最近成功 / 待重试 / 尚未成功</dt>
                <dd>
                  {formatCount(a.tiles.successful)} / {formatCount(a.tiles.failed)} /{" "}
                  {formatCount(a.tiles.pending)}
                </dd>
              </dl>
              <p className="text-12 text-tertiary">
                {a.collector.global_scan_complete
                  ? "已记录首轮扫描完成。"
                  : "全球首轮扫描尚未完成。"}
                网格会动态细分，数量不代表全球覆盖百分比。
              </p>
            </Card>
          </div>
        </Tabs.Content>
        <Tabs.Content value="backup" className="space-y-5 pt-5">
          <Card>
            <h2 className="text-16 font-semibold">NAS 容量</h2>
            <NasCapacity share={a.nas_share} />
            <NasVolumeCapacity volume={a.nas_volume} />
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-16 font-semibold">NAS 备份回执</h2>
              <Badge
                variant={b.tone === "good" ? "success" : b.tone === "bad" ? "danger" : "warning"}
              >
                {b.label}
              </Badge>
            </div>
            <Table>
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
          <Card>
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
