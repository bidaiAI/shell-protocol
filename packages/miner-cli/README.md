# $SHELL Miner CLI

通过红队测试 AI Agent 来挖掘 $SHELL 积分。矿机会自动从 Oracle 拉取攻击任务，使用你的 LLM 生成攻击载荷，并提交结果。

## 安装方式

### 方式一：从源码安装（推荐，当前阶段）

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

# 5. 构建
pnpm build

# 6. 开始挖矿
node dist/index.js start
```

### 方式二：npx（npm 发布后可用）

```bash
npx @openshell-cc/miner-cli start
```

> **注意**：此命令需要包已发布到 npm。

---

## 配置说明

复制 `.env.example` 为 `.env`，填入以下内容：

### 必填

| 变量 | 说明 |
|------|------|
| `ORACLE_URL` | $SHELL Oracle 地址（默认：`https://oracle.openshell.cc`） |
| `WALLET_PRIVATE_KEY` | Solana 钱包私钥（base58 格式），用于签名认证 |
| `LLM_API_KEY` | 你的 LLM 提供商 API 密钥 |

### 可选

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LLM_PROVIDER` | `anthropic` | LLM 提供商：`anthropic` / `openai` / `deepseek` |
| `LLM_MODEL` | 各提供商默认值 | 指定模型名称 |
| `EXECUTION_MODE` | `auto` | `auto` / `local_only` / `sandbox_only` |
| `POLLING_INTERVAL_MS` | `5000` | 拉取任务间隔（毫秒） |

### 获取 Solana 钱包私钥

如果你没有 Solana 钱包，可以用 Solana CLI 生成：

```bash
# 安装 Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 生成新钱包（会生成 miner-wallet.json）
solana-keygen new --outfile miner-wallet.json

# 查看私钥（base58 格式，复制到 WALLET_PRIVATE_KEY）
cat miner-wallet.json
```

> **安全提示**：`miner-wallet.json` 和 `.env` 不要提交到 Git，`.gitignore` 已默认排除。

---

## 执行模式说明

| 模式 | 说明 |
|------|------|
| `auto` | 接受 Oracle 分配的任何任务（local_compute 或 sandbox_verified） |
| `local_only` | 仅接受 `local_compute` 任务，跳过沙盒任务 |
| `sandbox_only` | 仅接受 `sandbox_verified` 任务，跳过本地计算任务 |

**推荐**：使用 `auto` 以获得最多任务。

---

## 命令

```bash
# 开始挖矿
node dist/index.js start

# 使用推荐码注册（首次）
node dist/index.js start --referral <推荐码>

# 查看挖矿状态
node dist/index.js status
```

---

## 支持的 LLM 提供商

| 提供商 | `LLM_PROVIDER` | 默认模型 | 获取 API Key |
|--------|----------------|----------|-------------|
| Anthropic | `anthropic` | `claude-sonnet-4-6-20260320` | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | `openai` | `gpt-4o-mini` | [platform.openai.com](https://platform.openai.com) |
| DeepSeek | `deepseek` | `deepseek-chat` | [platform.deepseek.com](https://platform.deepseek.com) |

---

## 开发模式

```bash
# 在 monorepo 根目录运行（不需要 build）
pnpm --filter @openshell-cc/miner-cli dev -- start
```
