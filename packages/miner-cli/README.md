# $SHELL Miner CLI

通过红队测试 AI Agent 来挖掘 $SHELL 积分。注册即可免费挖矿，自带 LLM API Key 可获 5 倍积分。

## 双模式挖矿

| 模式 | 积分倍率 | API Key | 轮询间隔 | 说明 |
|------|----------|---------|----------|------|
| 🆓 **免费模式** | ×0.2 | 不需要 | 20-40 分钟 | 零门槛，平台 AI 生成 payload |
| ⚡ **高效模式** | ×1.0 | 需要 LLM API Key | 60-120 秒 | 本地 LLM，5 倍积分，无次数限制 |

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
| `LLM_PROVIDER` | LLM 提供商：`anthropic` / `openai` / `deepseek`（默认自动检测） |
| `LLM_MODEL` | 指定模型（可选，各提供商有默认值） |
| `EXECUTION_MODE` | `sandbox_only`（默认）/ `auto`（有 LLM Key 时推荐） |

> **轮询间隔自动调整**：免费模式 20-40 分钟随机间隔，高效模式 60-120 秒随机间隔，无需手动配置。

### 支持的 LLM 提供商

| 提供商 | `LLM_PROVIDER` | 默认模型 | 获取 API Key |
|--------|----------------|----------|-------------|
| Anthropic | `anthropic` | `claude-haiku-4-5` | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | `openai` | `gpt-4o-mini` | [platform.openai.com](https://platform.openai.com) |
| DeepSeek | `deepseek` | `deepseek-chat` | [platform.deepseek.com](https://platform.deepseek.com) |

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

- **有 `LLM_API_KEY`** → ⚡ 高效模式（×1.0 积分，60-120 秒轮询）
- **无 `LLM_API_KEY`** → 🆓 免费模式（×0.2 积分，20-40 分钟轮询）

无需手动设置挖矿模式，矿机根据环境变量自动推断。

### 免费模式限制

- 每日提交次数有限（默认 10 次，邀请码可增加）
- 同一 IP 仅允许 1 个免费矿工
- 轮询间隔 20-40 分钟

### 高效模式优势

- 积分 5 倍（×1.0 vs ×0.2）
- 无次数限制
- 轮询间隔 60-120 秒
- 可参与 `local_compute` 任务
- API Key 仅在本地运行，不上传平台

---

## API Key 安全说明

高效模式中，你的 LLM API Key（Anthropic / OpenAI / DeepSeek）：

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
