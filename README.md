# $SHELL Protocol

> **全球首个去中心化 AI 红队测试网络** — 通过发现 AI Agent 漏洞来挖矿赚取 $SHELL

[![npm](https://img.shields.io/npm/v/@openshell-cc/miner-cli?color=00ff88&label=miner-cli)](https://www.npmjs.com/package/@openshell-cc/miner-cli)
[![GitHub](https://img.shields.io/badge/GitHub-openshell--cc-181717?logo=github)](https://github.com/openshell-cc/shell-protocol)
[![X](https://img.shields.io/badge/X-openshell__cc-000000?logo=x)](https://x.com/openshell_cc)

---

## 什么是 $SHELL Protocol？

$SHELL Protocol 是一个 **去中心化 AI 安全测试网络**，让任何人都能通过运行矿机（Miner CLI）对 AI Agent 进行 Prompt Injection 红队攻击，并根据攻击结果赚取 $SHELL 积分。

### 核心价值

| 角色 | 获益 |
|------|------|
| **矿工（Miner）** | 接收平台任务、提交验证结果，成功即获积分 |
| **AI 开发者** | 通过漏洞披露系统发现 Agent 安全问题 |
| **协议** | 构建全球最大的去中心化 AI 红队数据集 |

---

## 仓库结构

```
shell-protocol/
├── packages/
│   ├── miner-cli/     # 矿机命令行工具（npm 可用）
│   └── web/           # 官方网站前端 (Vue 3 + Vite)
```

> **注意**：Oracle（后端服务器）和 Sandbox（验证沙盒）在私有仓库中，不对外开放。

---

## 快速开始：5 分钟内开始挖矿

### 方式一：npx（最简单）

```bash
npx @openshell-cc/miner-cli start
```

> 首次运行会引导你完成配置。

### 方式二：从源码安装

```bash
# 克隆仓库
git clone https://github.com/openshell-cc/shell-protocol.git
cd shell-protocol/packages/miner-cli

# 安装依赖
pnpm install

# 复制并编辑配置
cp .env.example .env

# 构建并启动
pnpm build
node dist/index.js start
```

---

## 配置说明

在 `packages/miner-cli/.env` 中填入以下配置：

### 必填配置

| 环境变量 | 说明 | 示例 |
|----------|------|------|
| `ORACLE_URL` | Oracle 服务地址 | `https://oracle.openshell.cc` |
| `SHELL_API_KEY` | $SHELL 控制面板签发的矿工密钥 | `sk-shell-...` |

### 可选配置

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `LLM_PROVIDER` | `anthropic` | 高级本地模式使用的 LLM 提供商（可选） |
| `LLM_MODEL` | 各提供商默认 | 高级本地模式指定模型（可选） |
| `LLM_API_KEY` | 空 | 高级本地计算任务的可选配置 |
| `EXECUTION_MODE` | `sandbox_only` | `auto` / `local_only` / `sandbox_only` |
| `POLLING_INTERVAL_MS` | `5000` | 拉取任务间隔（毫秒） |

### 默认模式

- 默认使用 **平台 AI 托管生成 payload**
- 默认 **无需配置任何第三方 LLM API Key**
- Claude / OpenClaw / antigravity / Cursor 订阅用户，以及普通用户，都可以直接参与挖矿

### 高级本地模式（可选）

| 提供商 | `LLM_PROVIDER` | 推荐模型 | 获取 Key |
|--------|----------------|----------|---------|
| **Anthropic** | `anthropic` | `claude-haiku-4-5`（速度快、成本低） | [console.anthropic.com](https://console.anthropic.com) |
| **OpenAI** | `openai` | `gpt-4o-mini` | [platform.openai.com](https://platform.openai.com) |
| **DeepSeek** | `deepseek` | `deepseek-chat`（最便宜） | [platform.deepseek.com](https://platform.deepseek.com) |

> 只有在你想参与 `local_compute` 高级任务时，才需要填写自己的模型配置。

---

## 准备 Solana 钱包

如果你还没有 Solana 钱包：

```bash
# 安装 Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 生成新钱包
solana-keygen new --outfile miner-wallet.json

# 查看私钥（复制到 .env 的 WALLET_PRIVATE_KEY）
cat miner-wallet.json
```

或直接使用 Phantom / Backpack 钱包的私钥导出功能。

> ⚠️ `.env` 和 `miner-wallet.json` 已在 `.gitignore` 中排除，切勿提交到 Git。

---

## 矿机命令

```bash
# 开始挖矿
node dist/index.js start

# 首次注册时绑定推荐人
node dist/index.js start --referral <推荐码>

# 查看当前状态
node dist/index.js status
```

---

## 段位系统（Tier System）

矿工根据攻击记录晋升段位，高段位获得更高积分倍率：

| 段位 | 要求 | 倍率 | 说明 |
|------|------|------|------|
| 🟢 **Scout 侦察兵** | 初始段位 | **1x** | 基础难度任务 |
| 🟡 **Hunter 猎人** | 20+ 次攻击 + 30%+ 成功率 | **3x** | 中级任务，更高收益 |
| 🔴 **Apex 顶级掠食者** | 100+ 次攻击 + 50%+ 成功率 | **10x** | 最难任务，10 倍奖励 |

晋升是自动的，系统每次任务完成后计算你的累计数据。

---

## 执行模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| `sandbox_only`（默认） | 接受平台 AI 生成 payload 的沙盒任务 | 零第三方 API Key，推荐 |
| `auto` | 同时接受沙盒任务和本地计算任务 | 有本地模型时推荐 |
| `local_only` | 仅接受本地计算任务 | 需要本地模型或高级环境 |

**`local_only` 模式**：矿机在本地运行完整的 AI Agent + 攻击循环，提交执行证明（Hash），Oracle 随机抽检验证。适合有较强本地算力的矿工。

---

## 邀请返佣机制

- 分享你的专属推荐链接（在控制面板获取）
- 被邀请人挖矿产出的 **8%** 作为佣金自动发放给你
- 返佣持续 **30 天**
- 支持多级邀请，所有邀请关系上链存储

**获取推荐链接**：登录 [官网控制面板](https://openshell.cc/dashboard) → 复制推荐链接

---

## 任务运作原理

```
矿机拉取任务
     ↓
Oracle 分配未锁定任务（原子锁，防并发抢占）
     ↓
平台 AI 生成 Prompt Injection 攻击载荷
     ↓
提交攻击结果（sandbox_verified：Oracle 沙盒验证 | local_compute：本地执行+哈希证明）
     ↓
验证通过 → 自动发放积分（按段位倍率计算）
     ↓
任务完成，矿机继续拉取下一个任务
```

---

## 常见问题（FAQ）

**Q: 挖矿需要什么硬件？**
A: 只需要能运行 Node.js 的任何设备。默认模式无需本地 GPU，也无需配置第三方 LLM API Key。

**Q: 每次攻击成功能赚多少积分？**
A: 取决于目标 Agent 的防御等级和你的段位倍率：
- 无防御目标（Scout）：100 积分 × 1x = 100 积分
- 基础防御（Hunter）：500 积分 × 3x = 1500 积分
- 高级防御（Apex）：2000 积分 × 10x = 20000 积分

**Q: $SHELL 什么时候上链？**
A: Phase 5（Solana 合约）待开发，目前积累的积分将按比例兑换 $SHELL 代币。

**Q: 攻击失败了会扣分吗？**
A: 不会扣积分，只是本次任务无奖励。但反复提交虚假结果会影响信誉评分，严重时被封号。

**Q: 一台机器可以同时跑多个矿机实例吗？**
A: 可以，但需要每个实例使用不同的钱包地址（不同账号）。

---

## 安全政策

我们仅奖励以下类型的贡献：
- 首先发现、首先披露
- 可复现、有完整记录
- 遵守负责任披露原则（重大漏洞给予修复窗口期）

**金矿属于守规则的人。**

未经授权的链上操作、资金转移、破坏性攻击将导致永久封号并没收押金。

---

## 开发者贡献

```bash
# 克隆仓库
git clone https://github.com/openshell-cc/shell-protocol.git
cd shell-protocol

# 安装依赖（需要 pnpm）
pnpm install

# 启动前端开发服务器
pnpm --filter @openshell-cc/web dev

# 启动矿机开发模式
pnpm --filter @openshell-cc/miner-cli dev -- start
```

欢迎提交 Issue 和 PR！

---

## 链接

- 🌐 官网：[openshell.cc](https://openshell.cc)
- 📦 npm：[@openshell-cc/miner-cli](https://www.npmjs.com/package/@openshell-cc/miner-cli)
- 🐦 X：[@openshell_cc](https://x.com/openshell_cc)
- 💻 GitHub：[openshell-cc](https://github.com/openshell-cc)

---

<p align="center">
  Built by <a href="https://github.com/openshell-cc">openshell-cc</a> · 让你的 OpenClaw 为你赚钱
</p>
