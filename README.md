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

## 快速开始：3 分钟内开始挖矿

### 第一步：注册账号

访问 [openshell.cc](https://openshell.cc) 注册账号（邮箱即可），然后在控制面板签发 `$SHELL API Key`（格式：`sk-shell-xxx`）。

> 💡 **空投准备**：在控制面板绑定你的 Solana 钱包地址，后续 $SHELL 代币上链时直接空投到账。

### 第二步：启动矿机

```bash
# 方式一：npx 一键启动（推荐）
npx @openshell-cc/miner-cli@latest setup
npx @openshell-cc/miner-cli@latest start

# 方式二：全局安装
npm install -g @openshell-cc/miner-cli
miner-cli setup
miner-cli start
```

首次运行 `setup` 向导会引导配置。**默认模式仅需 `SHELL_API_KEY`**，无需 GPU，无需第三方 LLM API Key。

---

## 配置说明

在 `packages/miner-cli/.env` 中填入以下配置（或通过 `setup` 向导生成）：

### 必填配置

| 环境变量 | 说明 | 示例 |
|----------|------|------|
| `ORACLE_URL` | Oracle 服务地址 | `https://oracle.openshell.cc` |
| `SHELL_API_KEY` | 控制面板签发的矿工密钥 | `sk-shell-...` |

### 可选配置（高级本地模式）

默认模式下，**平台 AI 负责生成攻击 Payload**，矿工无需配置任何 LLM API Key。
如果你希望参与高级 `local_compute` 任务，可选填以下配置：

| 环境变量 | 说明 | 推荐值 |
|----------|------|--------|
| `LLM_PROVIDER` | LLM 提供商 | `anthropic` / `openai` / `deepseek` / `openrouter` |
| `LLM_API_KEY` | 对应提供商的 API Key | — |
| `LLM_MODEL` | 指定模型（可选） | 见下表 |
| `EXECUTION_MODE` | 执行模式 | `sandbox_only`（默认） |
| `POLLING_INTERVAL_MS` | 拉取任务间隔（毫秒） | `5000` |

### 支持的 LLM 提供商（本地模式）

| 提供商 | `LLM_PROVIDER` | 推荐模型 | 说明 |
|--------|----------------|----------|------|
| **Anthropic** | `anthropic` | `claude-haiku-4-5` | 速度快、成本低 |
| **OpenAI** | `openai` | `gpt-4o-mini` | 通用选择 |
| **DeepSeek** | `deepseek` | `deepseek-chat` | 最便宜，性价比最高 |
| **OpenRouter** | `openrouter` | 任意支持模型 | 多模型统一接入 |

---

## 执行模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| `sandbox_only`（默认） | 平台 AI 生成 payload，Oracle 沙盒验证 | **零 API Key，推荐所有人** |
| `auto` | 同时接受沙盒任务和本地计算任务 | 有自己的 LLM API Key 时使用 |
| `local_only` | 仅接受本地计算任务 | 需要 `LLM_API_KEY` |

**v0.2.4 新功能**：
- 矿机调用平台 `POST /tasks/payload` 端点，由 Oracle AI 生成 Prompt Injection 攻击载荷，矿机直接提交验证，无需自备任何 AI 资源
- 提交后自动轮询 `GET /tasks/result/:id`，最长等待 120 秒；验证完成时终端显示成功/失败及积分；超时任务通过 `miner-cli status` 查询近期 submission 状态
- Payload 完整性签名：Oracle 对生成的 payload 进行 HMAC 签名，提交时服务端验证，防止矿机篡改平台 payload

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

## 任务运作原理

```
矿机拉取任务（GET /tasks/poll）
     ↓
Oracle 分配未锁定任务（原子锁，防并发抢占）
     ↓
平台 AI 生成 Prompt Injection 攻击载荷（POST /tasks/payload）
     ↓
矿机提交攻击结果（POST /tasks/submit）
     ↓
Oracle 沙盒验证（异步，通常 5–30 秒）
     ↓
矿机轮询结果（GET /tasks/result/:id，最长 120 秒）
→ 终端显示成功/失败及积分；超时则通过 `miner-cli status` 查询
     ↓
验证通过 → 自动发放积分（按段位倍率计算）
     ↓
任务完成，矿机继续拉取下一个任务
```

---

## 矿机命令

```bash
# 初始配置向导（首次运行）
miner-cli setup

# 开始挖矿
miner-cli start

# 首次注册时绑定推荐人
miner-cli start --referral <推荐码>

# 查看当前状态
miner-cli status
```

---

## 邀请返佣机制

- 分享你的专属推荐链接（在控制面板获取）
- 被邀请人挖矿产出的 **8%** 作为佣金自动发放给你
- 返佣持续 **30 天**
- 支持多级邀请，所有邀请关系上链存储

**获取推荐链接**：登录 [官网控制面板](https://openshell.cc/dashboard) → 复制推荐链接

---

## 常见问题（FAQ）

**Q: 挖矿需要什么硬件？**
A: 只需要能运行 Node.js（v18+）的任何设备。默认模式无需本地 GPU，也无需配置任何第三方 LLM API Key。

**Q: 需要 Solana 钱包才能参与吗？**
A: 不需要。可直接用邮箱注册，通过控制面板签发 `sk-shell-xxx` 密钥开始挖矿。Solana 钱包为可选，用于后续代币兑换。

**Q: 每次攻击成功能赚多少积分？**
A: 取决于目标 Agent 的防御等级和你的段位倍率：
- 无防御目标（Scout）：100 积分 × 1x = 100 积分
- 基础防御（Hunter）：500 积分 × 3x = 1500 积分
- 高级防御（Apex）：2000 积分 × 10x = 20000 积分

**Q: $SHELL 什么时候上链？**
A: Phase 5（Solana 合约）待开发，目前积累的积分将按比例兑换 $SHELL 代币。**建议现在就在控制面板绑定 Solana 钱包**，空投时直接发放到你的钱包地址。

**Q: 攻击失败了会扣分吗？**
A: 不会扣积分，只是本次任务无奖励。但反复提交虚假结果会影响信誉评分，严重时被封号。

**Q: 一台机器可以同时跑多个矿机实例吗？**
A: 可以，但每个实例需要使用不同的账号和 API Key。

**Q: 平台支持哪些 LLM 进行本地计算？**
A: 支持 Anthropic、OpenAI、DeepSeek、OpenRouter，可通过 `.env` 配置切换。简单任务推荐 DeepSeek（最便宜），高难度任务推荐 Claude。

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
pnpm --filter @shell/web dev

# 启动矿机开发模式
pnpm --filter @openshell-cc/miner-cli dev -- start
```

欢迎提交 Issue 和 PR！

---

## 链接

- 🌐 官网：[openshell.cc](https://openshell.cc)
- 📦 npm：[@openshell-cc/miner-cli](https://www.npmjs.com/package/@openshell-cc/miner-cli)
- 🔐 漏洞公示：[openshell.cc/disclosures](https://openshell.cc/disclosures)
- 🐦 X：[@openshell_cc](https://x.com/openshell_cc)
- 💻 GitHub：[openshell-cc](https://github.com/openshell-cc)

---

## 协议钱包 · Protocol Wallets

Official protocol-controlled wallets for future onchain operations, reward distribution, and ecosystem transparency.

| 链 | 地址 |
|----|------|
| **EVM** (Ethereum / BSC / Polygon …) | `0xf1c1ef080e6aE6AABA999ba6E5D1545cD5Efab41` |
| **Solana** | `BrGihgGjCmpu2p96rou6GQj3sQpwgeud937jf4RvZP9G` |

---

<p align="center">
  Built by <a href="https://github.com/openshell-cc">openshell-cc</a> · 零 API Key，人人可挖矿
</p>
