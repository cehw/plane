import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@plane/propel/table";
import { HubCollectorStatus } from "./hub-collector-status";
import { eventTime } from "./hub-summary.helpers";
import { hkoCount } from "./hub-hko.helpers";
import type { HkoCoverage, splitHkoRows } from "./hub-hko.helpers";

export function HubHkoCollection({
  rows,
  coverage,
  compact = false,
}: {
  rows: ReturnType<typeof splitHkoRows>;
  coverage?: HkoCoverage;
  compact?: boolean;
}) {
  return (
    <section aria-label="HKO 采集分组" className="min-w-0 py-3">
      <details className="group/hko">
        <summary className="cursor-pointer rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary">
          <span className="text-13 font-semibold">HKO · 香港天文台</span>
          <span className="ml-2 text-11 text-tertiary group-open/hko:hidden">展开详情</span>
          <span className="ml-2 hidden text-11 text-tertiary group-open/hko:inline">收起详情</span>
          <span className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              { row: rows.stations, label: "站点实测" },
              { row: rows.products, label: "天气预报产品" },
            ].map(({ row, label }) => (
              <span key={row.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-12">
                <span
                  aria-label={row.health.label}
                  title={row.health.detail}
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    row.health.tone === "good"
                      ? "bg-success-primary"
                      : row.health.tone === "bad"
                        ? "bg-danger-primary"
                        : row.health.tone === "warn"
                          ? "bg-warning-primary"
                          : "bg-current text-tertiary"
                  }`}
                />
                <span>{label}</span>
                <time className="text-secondary" title="最近采集">
                  {eventTime(row.last_collected_at)}
                </time>
                {row.health.tone !== "good" && (
                  <span className="text-tertiary">{row.health.label}</span>
                )}
              </span>
            ))}
          </span>
          {rows.archive && rows.archive.health.tone !== "good" && (
            <span className="mt-2 block text-12 text-warning-primary">
              网站归档 · {rows.archive.health.label}
            </span>
          )}
        </summary>
        <div className="mt-3 border-t border-subtle pt-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <section aria-label="HKO 站点实测" className="min-w-0">
              <HubCollectorStatus row={rows.stations} title="站点实测" compact={compact} />
              {!compact && (
                <>
                  <p className="my-3 text-12 text-secondary">
                    按站点、观测时间和变量保存实测值，适合研究与模型验证。
                  </p>
                  {coverage ? (
                    <div className="space-y-2">
                      {coverage.station_feeds.map((feed) => (
                        <div key={feed.key} className="rounded-md bg-layer-1 p-2 text-12">
                          <div className="flex justify-between gap-2">
                            <span>{feed.label}</span>
                            <strong>{hkoCount(feed.station_count)}</strong>
                          </div>
                          <p className="mt-1 text-11 text-tertiary">
                            源观测 {eventTime(feed.observed_at)}
                          </p>
                          {feed.stations && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-accent-primary">
                                查看标准站名
                              </summary>
                              <p className="mt-2 break-words leading-relaxed text-secondary">
                                {feed.stations.join(" · ") || "本次无站点"}
                              </p>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-12 text-tertiary">站点数量等待同步</p>
                  )}
                </>
              )}
            </section>
            <section aria-label="HKO 天气预报产品" className="min-w-0">
              <HubCollectorStatus row={rows.products} title="天气预报产品" compact={compact} />
              {!compact && (
                <>
                  <p className="my-3 text-12 text-secondary">
                    保留当前天气、本地与九天预报、警告和特别提示。实况与站点实测有重叠，预报覆盖全港。
                  </p>
                  {coverage ? (
                    <>
                      <h5 className="mb-2 text-12 font-medium">产品内的实况观测</h5>
                      <div className="space-y-2">
                        {coverage.product_observations.map((row) => (
                          <div key={row.key} className="rounded-md bg-layer-1 p-2 text-12">
                            <div className="flex justify-between gap-2">
                              <span>{row.label}</span>
                              <strong>
                                {hkoCount(row.count, row.unit)}
                                {row.depth_count != null ? ` · ${row.depth_count} 个深度` : ""}
                              </strong>
                            </div>
                            <p className="mt-1 text-11 text-tertiary">
                              源观测 {eventTime(row.observed_at)}
                              {row.unit === "行政区" ? " · 区域汇总，不计站点数" : ""}
                            </p>
                            {(row.stations || row.areas) && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-accent-primary">
                                  {row.unit === "行政区" ? "查看行政区" : "查看标准站名"}
                                </summary>
                                <p className="mt-2 break-words leading-relaxed text-secondary">
                                  {(row.stations ?? row.areas)?.join(" · ") || "本次无地点"}
                                </p>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                      <h5 className="mb-2 mt-3 text-12 font-medium">预报与提示 · 全港</h5>
                      <ul className="space-y-1 text-12 text-secondary">
                        {coverage.products.map((product) => (
                          <li key={product.key}>
                            {product.label}：
                            {product.available
                              ? product.days != null
                                ? `${product.days} 天`
                                : "已保存"
                              : "本次文件未提供"}
                            {product.updated_at ? ` · 发布 ${eventTime(product.updated_at)}` : ""}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-12 text-tertiary">产品覆盖等待同步</p>
                  )}
                </>
              )}
            </section>
          </div>
          {!compact && coverage && (
            <div className="mt-4 border-t border-subtle pt-3">
              <h5 className="text-13 font-medium">两套实况的覆盖对比</h5>
              <div className="mt-2 overflow-x-auto">
                <Table className="min-w-[420px] whitespace-nowrap">
                  <TableHeader>
                    <TableRow>
                      <TableHead>变量</TableHead>
                      <TableHead>站点实测</TableHead>
                      <TableHead>产品实况</TableHead>
                      <TableHead>共有</TableHead>
                      <TableHead>去重并集</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coverage.comparisons.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell>{hkoCount(row.station_count)}</TableCell>
                        <TableCell>{hkoCount(row.product_count)}</TableCell>
                        <TableCell>{hkoCount(row.overlap)}</TableCell>
                        <TableCell>{hkoCount(row.union)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-12 text-secondary">
                {coverage.coverage_complete ? "两套数据" : "已读到的数据"}：
                {hkoCount(coverage.unique_station_names, "个去重标准站名")}
                。按名称集合去重，不相加变量、来源或深度；行政区不计入。
              </p>
              <p className="mt-1 text-11 text-tertiary">
                只统一明确别名；同一区域的不同设施仍保留，标准站名数不等于独立物理仪器数。两套数据保留各自源观测时间，覆盖交集不代表同一条观测。
              </p>
              <details className="mt-2 text-12">
                <summary className="cursor-pointer text-accent-primary">站名统一与覆盖差异</summary>
                <ul className="my-2 text-secondary">
                  {coverage.aliases.map((a) => (
                    <li key={a.alias}>
                      {a.alias} → {a.canonical}
                    </li>
                  ))}
                </ul>
                {coverage.comparisons.map((row) => (
                  <p key={row.key} className="mt-2 text-secondary">
                    {row.label} · 仅站点实测：
                    {row.station_only?.join(" · ") || (row.station_only ? "无" : "待同步")}
                    ；仅产品实况：
                    {row.product_only?.join(" · ") || (row.product_only ? "无" : "待同步")}
                  </p>
                ))}
              </details>
            </div>
          )}
          {rows.archive && (
            <details
              className="mt-3 border-t border-subtle pt-3 text-12"
              open={rows.archive.health.tone !== "good" || undefined}
            >
              <summary className="cursor-pointer text-secondary">
                附属网站归档 · {rows.archive.health.label} · 不另计站点
              </summary>
              <div className="mt-2">
                <HubCollectorStatus row={rows.archive} title="网站归档" />
              </div>
            </details>
          )}
        </div>
      </details>
    </section>
  );
}
