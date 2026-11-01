import { useState } from "react";
import { Card } from "@plane/propel/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@plane/propel/table";
import { NasCapacity, NasVolumeCapacity } from "./hub-nas-capacity";
import { HubDataMap } from "./hub-data-map";
import { countryGroups, countryName } from "./hub-coverage.helpers";
import { formatCount, eventTime, backupHealth, snapshotIsStale } from "./hub-summary.helpers";
import type { HubSnapshot } from "./hub-summary.helpers";

export function HubCoverage({
  snapshot,
  storage = false,
}: {
  snapshot: HubSnapshot;
  storage?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [includeLegacy, setIncludeLegacy] = useState(false);
  const a = snapshot.netatmo;
  const groups = countryGroups(a.countries ?? [], search, includeLegacy);
  const backup = backupHealth(snapshot);
  return (
    <div className="space-y-4">
      {snapshotIsStale(snapshot) && (
        <p role="status" className="text-12 text-warning-primary">
          快照已过期，下面为最后已知覆盖与存储状态。
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["近 24 小时站点", a.recent_stations],
          ["相对旧参考集新增", a.new_since_reference],
          ["近期国家 / 地区", a.recent_countries],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-12 text-tertiary">{label}</p>
            <p className="text-24 font-semibold">
              {formatCount(typeof value === "number" ? value : undefined)}
            </p>
          </Card>
        ))}
      </div>
      <Card>
        {a.map_cells ? (
          <HubDataMap cells={a.map_cells} />
        ) : (
          <p className="text-13 text-tertiary">覆盖格网等待同步，不能当作零覆盖。</p>
        )}
      </Card>
      {storage && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card>
            <h3 className="text-14 font-semibold">资产与存储</h3>
            <NasCapacity share={a.nas_share} />
            <NasVolumeCapacity volume={a.nas_volume} />
            <p className="text-13">
              {formatCount(a.archive.csv_files)} 个历史 CSV · {(a.archive.bytes / 1e9).toFixed(2)}{" "}
              GB
            </p>
            <p className="text-12 text-secondary">Climet3 保存观测与队列 → HD6500 NAS 备份</p>
            <p className="text-12 text-secondary">
              NAS：{eventTime(a.backup?.completed_utc)} · {backup.label}
            </p>
            <p className="text-11 text-tertiary">CSV 容量不含新增 SQLite；HRES 可重新下载。</p>
          </Card>
          <Card>
            <h3 className="text-14 font-semibold">数据完整性</h3>
            <p
              className={`text-13 ${a.archive.known_gap ? "text-warning-primary" : "text-secondary"}`}
            >
              {a.archive.known_gap ?? "暂无已记录缺口"}
            </p>
            <p className="text-12 text-tertiary">备份保存已有观测，不会补回历史缺口。</p>
          </Card>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-14 font-semibold">国家 / 地区 · 按大洲</h3>
        <input
          aria-label="筛选国家或大洲"
          placeholder="名称、代码或大洲"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 rounded-md border border-subtle bg-surface-1 px-3 py-2 text-13"
        />
      </div>
      <label className="flex items-center gap-2 text-12 text-secondary">
        <input
          type="checkbox"
          checked={includeLegacy}
          onChange={(e) => setIncludeLegacy(e.target.checked)}
        />
        包含仅在旧参考集中出现的地区
      </label>
      <div className="space-y-2">
        {groups.map((g) => (
          <details
            key={`${g.name}-${search}-${includeLegacy}`}
            open={search ? true : undefined}
            className="rounded-lg border border-subtle bg-surface-1"
          >
            <summary className="cursor-pointer px-4 py-3 text-13">
              <span className="font-medium">{g.name}</span>
              <span className="ml-3 text-tertiary">
                {g.rows.length} 个国家 / 地区 · {formatCount(g.recent)} 个近期站点
              </span>
            </summary>
            <div className="overflow-x-auto px-3 pb-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>国家 / 地区</TableHead>
                    <TableHead>近 24 小时</TableHead>
                    <TableHead>旧集独有</TableHead>
                    <TableHead>两者都有</TableHead>
                    <TableHead>近期新增</TableHead>
                    <TableHead>去重并集</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.rows.map(([code, old, both, fresh]) => (
                    <TableRow key={code}>
                      <TableCell>
                        {countryName(code)} <span className="text-tertiary">{code}</span>
                      </TableCell>
                      <TableCell>{formatCount(both + fresh)}</TableCell>
                      <TableCell>{formatCount(old)}</TableCell>
                      <TableCell>{formatCount(both)}</TableCell>
                      <TableCell>{formatCount(fresh)}</TableCell>
                      <TableCell>{formatCount(old + both + fresh)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </details>
        ))}
      </div>
      {!groups.length && (
        <p className="text-12 text-tertiary">
          {a.countries ? "没有匹配的国家 / 地区。" : "国家明细等待同步。"}
        </p>
      )}
      <p className="text-11 leading-relaxed text-tertiary">
        近期指近 24 小时真实观测；并集 {formatCount(a.combined_stations)}{" "}
        为已见站点，全球总站数未知。地理分组采用{" "}
        <a
          href="https://unstats.un.org/unsd/methodology/m49/"
          target="_blank"
          rel="noreferrer"
          className="text-accent-primary"
        >
          UN M49
        </a>
        ；中美洲与加勒比归入北美洲，跨洲地区按统计分组单列一次，未知代码保留在未归类。
      </p>
    </div>
  );
}
