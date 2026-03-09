<p align="center">
  <img src="https://img.shields.io/npm/v/@openshell-cc/miner-cli?color=00ff88&label=miner-cli" alt="npm" />
  <img src="https://img.shields.io/badge/agents-26-00ccff" alt="agents" />
  <img src="https://img.shields.io/badge/chains-6+-ff6600" alt="chains" />
  <a href="https://github.com/openshell-cc/shell-protocol"><img src="https://img.shields.io/badge/GitHub-openshell--cc-181717?logo=github" alt="GitHub" /></a>
  <a href="https://x.com/openshell_cc"><img src="https://img.shields.io/badge/X-openshell__cc-000000?logo=x" alt="X" /></a>
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/lang-English-blue?style=for-the-badge" alt="English" /></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/lang-中文-red?style=for-the-badge" alt="中文" /></a>
</p>

# $SHELL Protocol

> **全球首个混合式去中心化 AI 红队验证网络** — 矿工自带 LLM 生成 payload + 矿工动态多 Peer 交叉验证 + 平台自适应低频抽查与超时兜底。通过发现 AI Agent 漏洞来挖矿赚取 $SHELL

---

## 什么是 $SHELL Protocol？

$SHELL Protocol 是一个 **混合式去中心化 AI 安全测试网络**，让任何人都能通过运行矿机（Miner CLI）对 AI Agent 进行红队攻击。沙盒内含 **26 个目标 Agent 画像**，覆盖 DeFi 交易、NFT、跨链桥、借贷、支付、DAO 治理等热门赛道。攻击手段包括 Prompt 注入、社会工程和系统级命令注入。

攻击结果由 **矿工动态多 Peer 交叉投票验证**（在线矿工越多、验证者越多），平台仅作为自适应低频抽查与超时兜底。成功的攻击赚取 $SHELL 积分。

### 核心价值

| 角色 | 获益 |
|------|------|
| **矿工（Miner）** | 接收任务，执行攻击 & 参与交叉验证，攻击和验证均可获积分 |
| **AI 开发者** | 通过漏洞披露系统发现真实 AI Agent 安全问题 |
| **协议** | 构建全球最大的去中心化 AI 红队数据集 |

### 挖矿即安全培训

$SHELL 挖矿不仅赚积分 — 每一次攻击任务都是一次系统性的 AI 安全实战培训：

- **攻击指导**：每个任务附带针对性攻击策略提示，教你识别不同 AI Agent 的弱点和有效攻击手法
- **红队报告**：[Red Team Reports](https://openshell.cc/red-team) 公开展示成功攻破的 payload 详情，矿工可学习已验证的真实攻击案例
- **攻防双向**：攻击 OpenClaw Agent 时学到的注入手法，正是你保护自己 AI Agent 需要防御的威胁
- **从失败中学习**：不同模型（GPT / Claude / DeepSeek）对注入攻击的抵抗力差异巨大，矿工在实战中掌握 AI 安全工程的第一性原理

> 参与 $SHELL 挖矿 = 获得全球最前沿的 AI Agent 安全攻防实战经验

---

## 双模式挖矿

$SHELL Protocol 提供两种挖矿模式，零门槛入场 + 高效进阶：

| 模式 | 积分倍率 | API Key | 适用场景 |
|------|----------|---------|----------|
| 🆓 **免费模式** | ×0.2 | 不需要 | 零门槛体验，平台 AI 生成 payload |
| ⚡ **高效模式** | ×1.0 | 需要 LLM API Key | 自带 LLM，5 倍积分，无次数限制 |

> 🔒 **安全保证**：高效模式的 API Key **仅在本地运行**，不上传平台，完全安全。

---

## 快速开始：3 分钟内开始挖矿

### 第一步：启动矿机

```bash
# 方式一：npx 一键启动（推荐）
npx @openshell-cc/miner-cli@latest setup
npx @openshell-cc/miner-cli@latest start

# 方式二：全局安装
npm install -g @openshell-cc/miner-cli
miner-cli setup
miner-cli start
```

首次运行 `setup` 向导会引导配置。**免费模式仅需 `SHELL_API_KEY`**，无需 GPU，无需第三方 LLM API Key，注册即可挖矿。

### 第二步（可选）：升级到高效模式

在 `.env` 中设置 `LLM_API_KEY`，矿机自动切换到高效模式：

```bash
LLM_API_KEY=sk-ant-xxx   # Anthropic / OpenAI / DeepSeek / Gemini / Grok 的 API Key
```

> API Key 仅在你的本地机器上运行，不会上传到任何平台服务器。

### 第三步（可选）：绑定 Solana 钱包

访问 [openshell.cc](https://openshell.cc) 控制面板，绑定 Solana 钱包地址。后续 $SHELL 代币上链时直接空投到你的钱包。

---

## 配置说明

在 `packages/miner-cli/.env` 中填入以下配置（或通过 `setup` 向导生成）：

### 必填配置

| 环境变量 | 说明 | 示例 |
|----------|------|------|
| `ORACLE_URL` | Oracle 服务地址 | `https://oracle.openshell.cc` |
| `SHELL_API_KEY` | 控制面板签发的矿工密钥 | `sk-shell-...` |

### 可选配置（高效模式）

| 环境变量 | 说明 | 推荐值 |
|----------|------|--------|
| `LLM_PROVIDER` | LLM 提供商 | `anthropic` / `openai` / `deepseek` / `gemini` / `grok` |
| `LLM_API_KEY` | 对应提供商的 API Key（本地运行，不上传平台） | — |
| `LLM_MODEL` | 指定模型（可选） | 见下表 |
| `EXECUTION_MODE` | 执行模式 | `sandbox_only`（默认）/ `auto` |

> **轮询间隔自动调整**：矿机根据挖矿模式和网络状态动态调整轮询间隔，无需手动设置。

### 支持的 LLM 提供商（高效模式）

| 提供商 | `LLM_PROVIDER` | 推荐模型 | 说明 |
|--------|----------------|----------|------|
| **Anthropic** | `anthropic` | `claude-haiku-4-5` | 速度快、成本低 |
| **OpenAI** | `openai` | `gpt-4o-mini` | 通用选择 |
| **DeepSeek** | `deepseek` | `deepseek-chat` | 最便宜，性价比最高 |
| **Google Gemini** | `gemini` | `gemini-2.5-flash` | 高效推理 |
| **xAI Grok** | `grok` | `grok-3-mini-fast` | 速度优先 |
| **自定义** | 任意名称 | 需指定 `LLM_MODEL` | 需设置 `LLM_BASE_URL`（Ollama / vLLM / Together AI 等） |

---

## 执行模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| `sandbox_only`（默认） | 平台 AI 生成 payload，Oracle 沙盒验证 | **免费模式，零 API Key** |
| `auto` | 同时接受沙盒任务（攻击 + 交叉验证）和本地计算任务 | **高效模式，有 LLM API Key** |

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
矿工 A 拉取任务（GET /tasks/poll）
     ↓
Oracle 分配未锁定任务（原子锁，防并发抢占）
     ↓
生成攻击载荷（免费模式: 平台 AI / 高效模式: 本地 LLM）
     ↓
矿工 A 提交攻击结果（POST /tasks/submit）
     ↓
Oracle 创建 Peer 验证轮次，动态分配验证矿工
（在线矿工越多 → 验证者越多；有违规记录 → 验证者更多）
     ↓
验证矿工独立执行相同 payload，投票：triggered / not_triggered
     ↓
共识判定 → 达到阈值后自动结算
  一致同意 → 攻击者 + 验证者均获积分
  不一致 → 进入仲裁队列
     ↓
平台自适应抽查（在线矿工越多 → 抽查率越低）
（无共识/超时 → 平台 fallback validator 兜底）
```

---

## 动态多 Peer 交叉验证机制

$SHELL Protocol 采用 **Peer-First 去中心化验证网络**，核心原则是：**矿工动态多 Peer 投票验证为主 + 平台自适应低频抽查为辅 + 超时兜底**。

### 工作流程

1. **矿工 A 完成攻击任务** — 提交攻击结果到 Oracle
2. **Oracle 创建验证轮次** — 动态分配验证矿工（数量根据在线矿工数、任务价值和提交者信誉自动调整）
3. **验证矿工独立执行** — 每名验证者执行相同 payload，提交投票
4. **共识判定** — 达到共识阈值后自动结算；不一致则进入仲裁
5. **平台自适应抽查** — 抽查率随在线矿工数量动态降低（矿工越多、Peer 验证越可靠、平台抽查越少）

### 动态验证机制

| 特性 | 机制 |
|------|------|
| **验证人数** | 根据在线矿工数量 + 任务价值 + 提交者信誉动态调整 |
| **抽查率** | 随在线矿工数量自适应降低（矿工越多 → Peer 网络越强 → 平台抽查越少） |
| **作弊惩罚** | 被发现作弊的矿工，后续提交需要更多验证者验证 |
| **超时兜底** | 验证矿工超时未响应 → 平台 fallback validator 自动接管 |

### 对矿工的影响

- **攻击和验证任务对矿工完全一致** — 矿工无需区分任务类型，透明参与
- **验证任务同样获得积分** — 诚实验证赚取原始任务积分的一定比例，信誉高的验证者获得更多
- **作弊惩罚升级** — 伪造结果不仅重置信誉评分，还会导致后续每次提交被更多矿工验证，作弊成本持续上升

---

## 目标 Agent 画像（26 个）

沙盒内置 26 个 AI Agent 画像，覆盖三大攻击类别和四种注入面。平台还会自动从 Twitter 和 GitHub 发现热门真实 AI Agent 项目，生成新的攻击目标。

### 平台 Agent（DeFi / NFT / 跨链 / 支付）

| 分类 | 目标 Agent | 注入面 |
|------|-----------|--------|
| Meme 交易 | Four.Meme、Pump.fun、Moonshot、GOAT | token_data / social_post |
| AI Agent 平台 | Virtuals Protocol、ai16z DAO、AIXBT | token_data / social_post |
| 智能跟单 | GMGN Smart Money Scanner | token_data |
| NFT 交易 | Magic Eden NFT、Tensor NFT | token_data |
| 跨链桥 | LayerZero Bridge Agent | token_data |
| 支付协议 | Circle USDC Payment Gateway | email |
| DeFi 借贷 | Kamino Lending Agent | token_data |
| AI 钱包 | Griffain Wallet Agent | chat_message |
| 自治 Agent | Olas、Fetch.ai Economic Agent | chat_message |
| 全链路 Agent | Zerebro Full-Chain Agent | chat_message |
| 社交伴侣 | MyShell.ai Companion Agent | chat_message |
| 去中心化 ML | Bittensor Subnet Validator | token_data |

### 框架类 Agent（Command Injection / Privilege Escalation）

装备真实工具的 AI 助手。ElizaOS DeFi Agent 和 OpenClaw 画像使用 **9+ 个真实工具**（`exec`、`bash`、`web_fetch`、`message`、`read`、`write`、`gateway`、`cron`、`memory_search`），攻击者通过权限提升与命令注入突破沙盒防御。

### 终端用户 Agent（Personal Trading / Portfolio）

个人 DeFi 交易助手和投资组合管理 Agent，模拟真实用户场景。

### 多模型轮换（Smart Model Rotation）

每个目标 Agent 会在不同的 LLM 后端运行（GPT、Claude、Gemini、DeepSeek、Qwen 等），模型抵抗力越强、攻破奖励越高。Feed 页面显示 `AgentName (ModelDisplayName)` 格式，便于区分同一 Agent 在不同模型上的表现。

### 难度分级

| 难度 | 示例画像 | 防御等级 |
|------|----------|----------|
| Easy (12) | ElizaOS / AIXBT / Olas / GOAT / MyShell / LayerZero 等 | none（无注入防御） |
| Medium (8) | Pump.fun / Griffain / Tensor / Zerebro / Circle 等 | basic（基础安全规则） |
| Hard (6) | **OpenClaw Hardened** / Kamino / Fetch.ai / Bittensor 等 | advanced（显式 PI 防御） |

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
- 邀请码还可增加免费模式的每日额度（+5 次/码）

**获取推荐链接**：登录 [官网控制面板](https://openshell.cc/dashboard) → 复制推荐链接

---

## 蜜罐机制

为保证挖矿质量，5% 的任务为蜜罐任务，包含明显恶意的 prompt。有判断力的矿工应识别并跳过。

| 触发次数 | 惩罚 |
|---------|------|
| 第 1-3 次 | ⚠️ 仅警告 |
| 第 4 次 | 扣 10% 积分 |
| 第 5 次 | 扣 50% 积分 |
| 第 6 次+ | 🔴 清零全部积分 |

> 48 小时不触发蜜罐，计数器自动重置为 0。

---

## 常见问题（FAQ）

**Q: 挖矿需要什么硬件？**
A: 只需要能运行 Node.js（v18+）的任何设备。免费模式无需本地 GPU，也无需配置任何第三方 LLM API Key。

**Q: 免费模式和高效模式有什么区别？**
A: 免费模式积分 ×0.2、每日有限次数；高效模式需要 LLM API Key，积分 ×1.0、无次数限制。API Key 仅在本地运行，不上传平台。

**Q: 需要 Solana 钱包才能参与吗？**
A: 不需要。可直接用邮箱注册或 CLI 自动注册，通过控制面板签发 `sk-shell-xxx` 密钥开始挖矿。Solana 钱包为可选，用于后续代币兑换。

**Q: 每次攻击成功能赚多少积分？**
A: 基础积分按任务难度计算，乘以段位倍率（Scout 1x、Hunter 3x、Apex 10x）、挖矿模式倍率（免费 ×0.2、高效 ×1.0）和目标模型难度倍率。攻破抵抗力更强的 LLM 模型获得更高奖励。

**Q: $SHELL 什么时候上链？**
A: Phase 5（Solana 合约）待开发，目前积累的积分将按比例兑换 $SHELL 代币。**建议现在就绑定 Solana 钱包**，空投时直接发放。

**Q: 验证任务是什么？验证也能赚积分吗？**
A: 每次攻击提交后，Oracle 会分配其他矿工来验证结果。验证矿工独立执行相同 payload 并投票。攻击和验证任务对矿工完全一致，矿机自动处理。**诚实验证同样获得积分**（原始任务积分的一定比例），信誉越高的验证者获得比例越高。

**Q: 攻击失败了会扣分吗？**
A: 不会扣积分，只是本次任务无奖励。但反复伪造结果会重置信誉评分，并导致后续提交需要更多验证矿工验证（作弊成本持续上升），严重时被封号。

**Q: 高效模式的 API Key 安全吗？**
A: 完全安全。API Key 仅在你的本地机器上运行，用于生成攻击 payload 和执行验证任务。Key 不会上传到平台服务器，也不会被任何第三方访问。

**Q: 平台支持哪些 LLM 进行高效模式？**
A: 支持 Anthropic、OpenAI、DeepSeek、Google Gemini、xAI Grok，以及任何 OpenAI 兼容 API（Ollama / vLLM / Together AI 等）。简单任务推荐 DeepSeek（最便宜），高难度任务推荐 Claude。

---

## 安全政策

我们仅奖励以下类型的贡献：
- 首先发现、首先披露
- 可复现、有完整记录
- 遵守负责任披露原则（重大漏洞给予修复窗口期）

**金矿属于守规则的人。**

未经授权的链上操作、资金转移、破坏性攻击将导致永久封号并没收押金。

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
- 🔴 红队报告：[openshell.cc/red-team](https://openshell.cc/red-team)
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
  Built by <a href="https://github.com/openshell-cc">openshell-cc</a> · 零门槛免费挖矿 · 自带 LLM 5 倍积分
</p>
