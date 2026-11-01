import { useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@plane/propel/table";
import { HubDataMap } from "./hub-data-map";
import { countryGroups, countryName } from "./hub-coverage.helpers";
import { formatCount, snapshotIsStale } from "./hub-summary.helpers";
import type { HubSnapshot } from "./hub-summary.helpers";

export function HubCoverage({ snapshot }: { snapshot: HubSnapshot }) {
  const [search, setSearch] = useState("");
  const [includeLegacy, setIncludeLegacy] = useState(false);
  const a = snapshot.netatmo;
  const groups = countryGroups(a.countries ?? [], search, includeLegacy);
  return (
    <section
      aria-label="Netatmo 覆盖与扫描"
      className="rounded-xl border border-subtle bg-surface-1 p-4"
    >
      <h2 className="mb-3 text-16 font-semibold">Netatmo · 站点覆盖</h2>
      {snapshotIsStale(snapshot) && (
        <p role="status" className="text-12 text-warning-primary">
          快照已过期，下面为最后已知覆盖与存储状态。
        </p>
      )}
      <div className="mb-4 grid grid-cols-3 gap-3 border-b border-subtle pb-4">
        {[
          ["近 24 小时站点", a.recent_stations],
          ["相对旧参考集新增", a.new_since_reference],
          ["近期国家 / 地区", a.recent_countries],
        ].map(([label, value]) => (
          <div key={String(label)} className="min-w-0">
            <p className="text-12 text-tertiary">{label}</p>
            <p className="text-20 font-semibold tabular-nums">
              {formatCount(typeof value === "number" ? value : undefined)}
            </p>
          </div>
        ))}
      </div>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="min-w-0">
          {snapshot.station_map ? (
            <HubDataMap data={snapshot.station_map} />
          ) : (
            <p className="text-13 text-tertiary">真实站点位置等待同步，不能当作零覆盖。</p>
          )}
          <details className="mt-3 border-t border-subtle pt-3 text-12">
            <summary className="cursor-pointer font-medium">
              扫描进度 · {formatCount(a.tiles.successful)} 个网格最近成功 ·{" "}
              {formatCount(a.tiles.failed)} 个待重试
            </summary>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-2 text-secondary">
              <dt>近 24 小时模块观测</dt>
              <dd>{formatCount(a.recent_module_observations)}</dd>
              <dt>活动查询网格</dt>
              <dd>{formatCount(a.tiles.active)}</dd>
              <dt>尚未成功</dt>
              <dd>{formatCount(a.tiles.pending)}</dd>
            </dl>
            <p className="mt-2 text-11 text-tertiary">
              {a.collector.global_scan_complete ? "已记录首轮扫描完成。" : "全球首轮扫描尚未完成。"}
              网格会动态细分，数量不代表全球覆盖百分比。
            </p>
          </details>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-14 font-semibold">国家 / 地区 · 按大洲</h3>
            <input
              aria-label="筛选国家或大洲"
              placeholder="名称、代码或大洲"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-w-0 rounded-md border border-subtle bg-surface-1 px-3 py-2 text-13"
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
                className="border-b border-subtle"
              >
                <summary className="cursor-pointer py-2.5 text-13">
                  <span className="font-medium">{g.name}</span>
                  <span className="ml-3 text-tertiary">
                    {g.rows.length} 个国家 / 地区 · {formatCount(g.recent)} 个近期站点
                  </span>
                </summary>
                <div className="overflow-x-auto px-3 pb-3">
                  <Table className="min-w-[520px] whitespace-nowrap">
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
      </div>
    </section>
  );
}
