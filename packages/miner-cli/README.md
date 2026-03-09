# $SHELL Miner CLI

通过红队测试 AI Agent 来挖掘 $SHELL 积分。注册即可免费挖矿，自带 LLM API Key 可获 5 倍积分。

## 双模式挖矿

| 模式 | 积分倍率 | API Key | 说明 |
|------|----------|---------|------|
| 🆓 **免费模式** | ×0.2 | 不需要 | 零门槛，平台 AI 生成 payload |
| ⚡ **高效模式** | ×1.0 | 需要 LLM API Key | 本地 LLM，5 倍积分，无次数限制 |

> 🔒 **安全保证**：高效模式的 LLM API Key **仅在你的本地机器上运行**，不上传到任何平台服务器，完全安全。

---

## 安装方式

### 方式一：npx 一键启动（推荐）

```bash
npx @openshell-cc/miner-cli@latest setup
npx @openshell-cc/miner-cli@latest start
```

### 方式二：全局安装

```bash
npm install -g @openshell-cc/miner-cli
miner-cli setup
miner-cli start
```

### 方式三：从源码安装

```bash
# 1. 克隆仓库
git clone https://github.com/openshell-cc/shell-protocol.git
cd shell-protocol

# 2. 安装依赖（需要 pnpm）
pnpm install

# 3. 进入矿机目录
cd packages/miner-cli

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的密钥（见下方配置说明）

# 5. 构建 & 启动
pnpm build
node dist/index.js start
```

---

## 配置说明

复制 `.env.example` 为 `.env`，填入以下内容（或通过 `setup` 向导自动生成）：

### 必填

| 变量 | 说明 |
|------|------|
| `ORACLE_URL` | $SHELL Oracle 地址（默认：`https://oracle.openshell.cc`） |
| `SHELL_API_KEY` | $SHELL 控制面板签发的矿工密钥（`sk-shell-xxx`） |

### 可选（升级到高效模式）

| 变量 | 说明 |
|------|------|
| `LLM_API_KEY` | LLM API Key（设置后自动切换到高效模式，Key 仅本地使用） |
| `LLM_PROVIDER` | LLM 提供商（见下表，默认按 Key 前缀自动检测） |
| `LLM_MODEL` | 指定模型（可选，各提供商有默认值） |
| `LLM_BASE_URL` | 自定义 OpenAI 兼容 API 端点（用于 Ollama / vLLM / 自托管等） |
| `EXECUTION_MODE` | `sandbox_only`（默认）/ `auto`（有 LLM Key 时推荐） |

> **轮询间隔动态调整**：矿机根据挖矿模式和网络状态自动调整轮询间隔，无需手动配置。

### 支持的 LLM 提供商

| 提供商 | `LLM_PROVIDER` | 默认模型 | 获取 API Key |
|--------|----------------|----------|-------------|
| Anthropic | `anthropic` | `claude-haiku-4-5` | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | `openai` | `gpt-4o-mini` | [platform.openai.com](https://platform.openai.com) |
| DeepSeek | `deepseek` | `deepseek-chat` | [platform.deepseek.com](https://platform.deepseek.com) |
| Google Gemini | `gemini` | `gemini-2.5-flash` | [aistudio.google.com](https://aistudio.google.com) |
| xAI Grok | `grok` | `grok-3-mini-fast` | [console.x.ai](https://console.x.ai) |
| **自定义** | 任意名称 | 需指定 `LLM_MODEL` | 需设置 `LLM_BASE_URL` |

#### 自定义 OpenAI 兼容 API

任何支持 OpenAI Chat Completions API 格式的服务都可以使用：

```bash
# Ollama 本地推理
LLM_PROVIDER=openai
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3
LLM_API_KEY=ollama

# Together AI
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.together.xyz/v1
LLM_MODEL=meta-llama/Llama-3-70b-chat-hf
LLM_API_KEY=your-together-key

# 其他 OpenAI 兼容 API（vLLM, Fireworks, Groq 等）
LLM_PROVIDER=openai
LLM_BASE_URL=https://your-api-endpoint/v1
LLM_MODEL=your-model
LLM_API_KEY=your-key
```

---

## 命令

```bash
# 初始配置向导（首次运行）
miner-cli setup

# 开始挖矿
miner-cli start

# 使用推荐码注册（首次）
miner-cli start --referral <推荐码>

# 查看挖矿状态
miner-cli status
```

---

## 挖矿模式自动检测

矿机启动时自动检测模式：

- **有 `LLM_API_KEY`** → ⚡ 高效模式（×1.0 积分，高频轮询）
- **无 `LLM_API_KEY`** → 🆓 免费模式（×0.2 积分，低频轮询）

无需手动设置挖矿模式，矿机根据环境变量自动推断。

### 免费模式限制

- 每日提交次数有限（默认 10 次，邀请码可增加）
- 同一 IP 仅允许 1 个免费矿工
- 较低频率轮询

### 高效模式优势

- 积分 5 倍（×1.0 vs ×0.2）
- 无次数限制
- 高频轮询，任务响应更快
- 可参与 `local_compute` 任务
- API Key 仅在本地运行，不上传平台

---

## 积分规则与安全机制

### 反刷分系统

平台采用智能反刷分机制，鼓励多样化的攻击策略：

| 场景 | 积分规则 |
|------|----------|
| 首次攻破某 Agent | 全额积分 × 模型难度倍率 |
| 同一 Agent，不同攻击手段 | 全额积分（鼓励多样化策略） |
| 同一 Agent，相同攻击手段（同用户） | **0 分**（提示：请尝试不同策略） |
| 同一手段被多名矿工使用 | 积分递减（首批全额 → 逐步递减 → 最终 0 分） |

> 💡 **"相同攻击手段"** 是指触发了完全相同的 canary 操作集合。只要触发了不同的操作组合，就视为新策略。

### 蜜罐检测（渐进惩罚）

平台会随机插入蜜罐任务，识别恶意矿工。蜜罐失败的惩罚是渐进式的：

| 失败次数 | 惩罚 |
|----------|------|
| 第 1-3 次 | ⚠️ 仅警告，不扣分 |
| 第 4 次 | 扣 10% 积分 |
| 第 5 次 | 扣 50% 积分 |
| 第 6 次+ | 🔴 清零全部积分 |

> 蜜罐任务会在结果中标识为 `result: 'penalty'`，包含 `warningLevel` 和 `remainingPoints`。

---

## API Key 安全说明

高效模式中，你的 LLM API Key：

- **仅在你的本地机器上运行**，用于生成攻击 payload 和执行验证任务
- **不会上传到平台服务器**（Oracle 不接收也不存储你的 Key）
- **不会被任何第三方访问**
- 你可以随时在 LLM 提供商的控制面板查看 Key 的使用记录

---

## 开发模式

```bash
# 在 monorepo 根目录运行（不需要 build）
pnpm --filter @openshell-cc/miner-cli dev -- start
```
