# Plane 首页摘要

## 页面与数据职责

首页在原生工作区中展示六张图标卡片：近 24 小时 Netatmo 站点、国家/地区代码数量、采集状态、NAS 备份、历史 CSV 归档、Plane 当前未完成任务。下方展示原工作时间轴的近期记录和数据运行摘要。沿用 Plane 主题、图标、登录和工作区权限；没有嵌入外部 HTML 或在浏览器保存服务密钥。

当前任务来自 Plane 数据库，过滤当前用户可见项目及已归档/草稿条目。历史记录仅作为历史展示，其“进行中”不计入当前待办。

`GET /api/workspaces/<slug>/hub-summary/` 要求已有 Plane 登录，以及工作区管理员或成员身份。每个工作区只读取自己的 `<slug>.json`。缺少快照时显示等待状态，不伪造零值或正常状态。

## 本机摘要同步

既有工作看台 `scripts/data-status-client.mjs` 支持可选 `hubSnapshotPath`。调用方通过隐藏 stdin 提供已有 Sites 凭据、`operation=sync` 和私有输出文件路径；客户端只读导出 Climet3 状态、更新 Sites 后读回，读取工作记录，将聚合摘要原子替换到本地文件。该文件不得加入 Git。挂载整个摘要目录至 API 容器 `/code/hub-data`，只读；文件名使用实际工作区 slug。

快照包含 `snapshot`（已有 Netatmo 摘要）、`work_records`（id、项目、标题、种类和日期）、`work_records_updated_at` 和 `workdesk_url`。没有原始观测、站点 ID、采集凭据或 Sites token。

网页每分钟读取已同步状态。采集状态超过 90 分钟未同步则标过期；最近观测超过 60 分钟标延迟；最近 NAS 成功回执超过 90 分钟标延迟，最近失败单独展示。同步任务仍在 Windows Codex 本机运行，离线时保留最近快照并显示其时间。

## 构建和运行

基于上游 `v1.4.3`。在仓库根目录使用 Docker：

```sh
docker build -t plane-hub/web-deps:v1.4.3 -f deployments/hub/Dockerfile.web-deps .
docker build -t plane-hub/web:v1.4.3-hub1 -f deployments/hub/Dockerfile.web-hub .
docker build -t plane-hub/api:v1.4.3-hub1 -f deployments/hub/Dockerfile.api-hub .
```

Windows Git 检出会把上游 i18n 符号链接存为文本，web 构建文件在 Linux 内恢复该链接，保证原生语言资源被打包。

web 镜像替换前端静态资源；API 镜像在官方后端上新增摘要接口。无需数据库迁移。使用现有 Compose 的本地覆盖配置指定上述 web / api 镜像及摘要目录挂载，其他服务沿用发布配置。具体本机入口、目录和回退配置见不公开的 `local-hub.md`。

## 验证

- 六项前端单元测试：过期源状态、最新备份失败、观测延迟、缺失快照、正常状态、历史记录顺序与语义。
- 五项后端单元测试：缺失/损坏快照、工作区文件隔离、匿名请求、已登录非成员。
- 实际工作区只读集成检查、前端构建、TypeScript 检查和新增代码 OxLint。
- 浏览器已验证登录后的真实指标、原生菜单语言、768px 窄屏布局与刷新按钮。

## 原生模块对应

项目和当前任务使用 Projects / Work items，说明和工作日志使用 Pages。全球观测与 NAS 监控使用本次原生首页摘要组件。现有工作时间轴仍是历史记录权威来源；未来迁移需保留日期、来源和记录类型，再明确唯一写入端。首页摘要不能把快捷入口接通等同于历史数据迁移完成。
