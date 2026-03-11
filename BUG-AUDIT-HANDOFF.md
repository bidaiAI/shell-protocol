# OpenShell ($SHELL Protocol) Bug 审计报告 — 交接文件

> **审计人**: Antigravity Agent
> **审计范围**: 公开仓库 `shell-protocol` 全部源码 (`packages/miner-cli` 11 文件, `packages/web` 20 文件)
> **代码版本**: miner-cli v0.4.4 (package.json), CLI 内部硬编码 v0.3.0 (index.ts L28)
> **审计日期**: 2026-03-11
> **请求**: 请 Claude 逐条复核以下发现，确认/否定每个 Bug，并补充遗漏

---

## 🔴 High Severity (2)

### BUG-2: executor.ts — baseURL 只硬编码 DeepSeek，Gemini/Grok 等 provider 全部失败

**位置**: `packages/miner-cli/src/local-sandbox/executor.ts` L164-170

```typescript
// executor.ts L164-170 — runWithOpenAI()
const client = new OpenAI({
  apiKey: config.llmApiKey,
  timeout: LLM_TIMEOUT_MS,
  baseURL: config.llmProvider === 'deepseek'
    ? 'https://api.deepseek.com'
    : undefined,   // ← Gemini/Grok/Moonshot/百炼 全部 fallback 到 OpenAI 默认 endpoint
})
```

**正确实现** (同仓库 `packages/miner-cli/src/llm/provider.ts` L68):

```typescript
const baseURL = config.llmBaseUrl || PROVIDER_PRESETS[config.llmProvider]?.baseUrl || undefined
```

**影响**: 使用 Gemini/Grok/Moonshot/百炼 provider 的矿工做 `local_compute` 任务时，API 请求发到 `api.openai.com` → 100% 失败。只有 `deepseek` 和 `openai` 能正常工作。

---

### BUG-7: config.ts — `inferMiningMode()` 与 `loadConfig()` 的 env var 检测列表不同步

**位置**: `packages/miner-cli/src/config.ts` L14 vs L77

```typescript
// L14 — inferMiningMode() 检测列表（5 个变量）
const LLM_KEY_ENV_VARS = ['LLM_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY', 'GEMINI_API_KEY']

// L77 — loadConfig() 实际 fallback 链（只有 3 个）
const llmApiKey = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || ''
//                                          ❌ 缺少 OPENAI_API_KEY    ❌ 缺少 DEEPSEEK_API_KEY
```

**影响**: 用户设置 `OPENAI_API_KEY=sk-proj-...` →  `inferMiningMode()` 返回 `'self_llm'`，但 `config.llmApiKey` 实际为空串。`validateConfig()` 报错 `EXECUTION_MODE=auto requires LLM_API_KEY`。DEEPSEEK_API_KEY 同理。

---

## 🟡 Medium Severity (5)

### BUG-1: 版本号不一致

- `packages/miner-cli/src/index.ts` L28: `program.version('0.3.0')` — 硬编码
- `packages/miner-cli/package.json`: `"version": "0.4.4"` — 实际 NPM 发布版本
- `shell-miner --version` 显示 `0.3.0`，实际安装的是 `0.4.4`

---

### BUG-4: Setup Wizard 硬编码 Oracle URL 可能过时

- `packages/miner-cli/src/index.ts` L46: 默认 `https://oracle.openshell.cc`
- 实际生产 Oracle 部署在 `https://oracle-production-252f.up.railway.app`
- 如果 DNS 未正确指向 Railway，新用户 setup wizard 会生成错误的 `.env`

---

### BUG-5: `requestPayloadFromOracle()` 和 `submitPayload()` 缺少 ORACLE_UNAVAILABLE 错误码

- `packages/miner-cli/src/poller.ts` L54-56: `pollForTask()` 把 404 映射为 `'ORACLE_UNAVAILABLE'`
- 同文件 L106-107 (`requestPayloadFromOracle`)、L132-133 (`submitPayload`): 404 只抛通用错误
- Oracle 部署切换期间，用户看到不友好的原始报错，没有重试提示

---

### BUG-8: proof.ts 的 sanitize 逻辑必须与服务端完全一致

- `packages/miner-cli/src/local-sandbox/proof.ts` L49-64
- 客户端截断: `agentResponse.slice(0, 5000)`, `payload.slice(0, 10000)`, `actionLog.slice(0, 50)`, arguments > 2048 字符替换为 `{ _truncated: true, _preview: ... }`
- 如果服务端 `sanitizeSubmissionData()` 的阈值或格式有任何偏差 → executionHash 不匹配 → FABRICATION 扣分
- 无法在公开仓库直接验证（服务端代码在私有仓库 `shell-oracle`）

---

### BUG-10: Web Frontend JWT 过期后无自动登出

- `packages/web/src/lib/api.ts` L40-43
- 401 响应时只抛 `ApiError`，不清除 `localStorage` 中的 token
- UI 持续显示"已登录"状态，但所有 API 请求都失败

---

## 🟢 Low Severity (4)

### BUG-3: executor.ts — rounds 计数 off-by-one

- `packages/miner-cli/src/local-sandbox/executor.ts` L114-152
- `for (rounds = 0; rounds < MAX_ROUNDS; rounds++)` 再 `return rounds + 1`
- 当循环正常走完（未 break）时，`rounds` 已被 `++` 到 `MAX_ROUNDS=5`，返回 `6` 而非 `5`

---

### BUG-6: polling interval 不一致

- `packages/miner-cli/src/index.ts` L309: 无任务时使用 `config.pollingIntervalMs`（`loadConfig` 首次计算的固定值）
- L464: 任务完成后使用 `getRandomPollInterval()`（每次随机）
- 两条路径 sleep 行为不一致，free 模式下无任务路径的 interval 是固定的而非随机抖动

---

### BUG-9: EXECUTION_MODE 需手动设置，miningMode 自动推断，容易误配

- 用户设了 `LLM_API_KEY` 但忘记改 `EXECUTION_MODE`（默认 `sandbox_only`）
- `miningMode = 'self_llm'` 但 `executionMode = 'sandbox_only'` → `local_compute` 任务被跳过
- 用户付了 API 成本但只能做 sandbox 任务

---

### BUG-11: API Key 用户 token 过期后进入无限失败循环

- `packages/miner-cli/src/index.ts` L445-459
- `walletPrivateKey` 用户能 re-auth；API Key 用户只打印错误，不 exit
- 矿机持续循环但每次都失败

---

## ⚠️ Warnings (4)

| ID | 描述 | 位置 |
|:---|:---|:---|
| WARN-1 | 整个仓库零测试，package.json 无 test script | 全局 |
| WARN-2 | `llm/prompts/tier*.ts` 未在 miner-cli 中引用，可能只供服务端使用 | `src/llm/prompts/` |
| WARN-3 | mock-tools.ts 中 EVM 链全用同一个硬编码地址 `0x742d...` | `src/local-sandbox/mock-tools.ts` L29-50 |
| WARN-4 | `buildInjectedMessage()` 中 payload 直接插入 JSON string 无转义 | `src/local-sandbox/executor.ts` L242-244 |

---

## 📋 文件清单 (供验证参考)

### packages/miner-cli/src/
| 文件 | 行数 | 关联 Bug |
|:---|:---|:---|
| `index.ts` | 669 | BUG-1, BUG-4, BUG-5, BUG-6, BUG-11 |
| `config.ts` | 176 | BUG-7, BUG-9 |
| `auth.ts` | 148 | — |
| `poller.ts` | 239 | BUG-5 |
| `llm/provider.ts` | 93 | (BUG-2 参照) |
| `local-sandbox/executor.ts` | 275 | BUG-2, BUG-3, WARN-4 |
| `local-sandbox/proof.ts` | 102 | BUG-8 |
| `local-sandbox/mock-tools.ts` | 205 | WARN-3 |
| `llm/prompts/tier1-token-injection.ts` | 45 | WARN-2 |
| `llm/prompts/tier2-social-engineering.ts` | 43 | WARN-2 |
| `llm/prompts/tier3-memory-poisoning.ts` | 43 | WARN-2 |

### packages/web/src/
| 文件 | 行数 | 关联 Bug |
|:---|:---|:---|
| `lib/api.ts` | 614 | BUG-10 |
| 其余 19 个文件 | — | 未发现 Bug |
