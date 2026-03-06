# $SHELL Protocol — 项目规则

## 仓库拆分原则

本项目分为两个独立仓库，**严格禁止**将闭源代码提交到公开仓库。

### 公开仓库: `shell-protocol`
- **内容**: `miner-cli` + `web`（用户端）
- **可见性**: Public
- **原则**: 不包含任何后端逻辑、蜜罐算法、积分计算、反作弊机制
- **包含的包**:
  - `packages/miner-cli` — 矿机 CLI（矿工本地运行）
  - `packages/web` — Vue 3 前端（排行榜、控制面板、任务动态）

### 私有仓库: `shell-oracle`
- **内容**: `oracle` + `sandbox`（服务端）
- **可见性**: Private
- **原则**: 包含所有核心验证逻辑，部署到服务器，绝不开源
- **包含的包**:
  - `packages/oracle` — 调度后端（Hono + PostgreSQL + BullMQ）
  - `packages/sandbox` — AI Agent 沙盒验证引擎
- **敏感内容**:
  - 蜜罐注入逻辑 (`honeypot.ts`)
  - 金丝雀操作列表 (`canaryActions`)
  - 积分计算算法 (`points.ts`)
  - Agent Profile 模板（含防御配置）
  - 反作弊评分权重

## 推送检查清单

每次 `git push` 前必须确认：
- [ ] 公开仓库不包含 `oracle/` 或 `sandbox/` 目录
- [ ] 公开仓库不包含 `.env` 文件或真实密钥
- [ ] `miner-cli` 和 `web` 只通过 HTTP API 与 Oracle 通信，不直接引用后端代码
- [ ] Agent Profile 的 `canaryActions` 字段不出现在任何公开代码中

## 技术栈

| 层 | 技术 | 位置 |
|---|------|------|
| 后端框架 | Hono | oracle |
| ORM | Drizzle + PostgreSQL | oracle |
| 任务队列 | BullMQ + Redis | oracle |
| 沙盒 LLM | Anthropic Claude (Haiku/Sonnet) | sandbox |
| 前端 | Vue 3 + Vite + Tailwind CSS v4 | web |
| 矿机 | Commander.js + 多 LLM | miner-cli |
| 认证 | SIWE (Solana) + JWT | oracle |
| 链 | Solana (Pump.fun 发射) | 全链攻击覆盖 |

## 开发约定

- 所有 API 接口先查文档再写代码，不猜参数
- TypeScript strict mode，零 `any`
- 前端全中文 UI
- 日志用结构化 JSON (pino 风格)
- 数据库操作用事务防止竞态条件
