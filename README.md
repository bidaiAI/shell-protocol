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

> **The world's first hybrid decentralized AI red-team verification network** — Miners bring their own LLMs to generate attack payloads + dynamic multi-peer cross-verification + adaptive platform spot-checks with timeout fallback. Earn $SHELL by discovering AI Agent vulnerabilities.

---

## What is $SHELL Protocol?

$SHELL Protocol is a **hybrid decentralized AI security testing network** where anyone can run a miner (Miner CLI) to perform red-team attacks against AI Agents. The sandbox contains **26 target Agent profiles** covering DeFi trading, NFTs, cross-chain bridges, lending, payments, DAO governance, and more. Attack techniques include prompt injection, social engineering, and system-level command injection.

Results are verified by a **dynamic multi-peer cross-validation network** (more online miners → more validators per submission). The platform only performs adaptive low-frequency spot-checks and timeout fallbacks. Successful attacks earn $SHELL points.

### Core Value

| Role | Benefit |
|------|---------|
| **Miners** | Receive tasks, execute attacks & participate in cross-validation, earn points for both |
| **AI Developers** | Discover real AI Agent security issues through the vulnerability disclosure system |
| **Protocol** | Build the world's largest decentralized AI red-team dataset |

### Mining = Security Training

$SHELL mining isn't just about earning points — every attack task is a hands-on AI security training session:

- **Attack Guidance**: Each task comes with targeted attack strategy hints, teaching you to identify different AI Agent weaknesses
- **Red Team Reports**: [Red Team Reports](https://openshell.cc/red-team) publicly showcase successful breach payloads — learn from verified real attack cases
- **Offense & Defense**: Injection techniques learned from attacking agents are exactly the threats you need to defend against
- **Learn from Failure**: Different models (GPT / Claude / DeepSeek) have vastly different injection resistance — miners learn AI security first principles through practice

> Participating in $SHELL mining = gaining cutting-edge AI Agent security combat experience

---

## Dual Mining Modes

$SHELL Protocol offers two mining modes — zero barrier to entry + advanced progression:

| Mode | Point Multiplier | API Key | Use Case |
|------|-----------------|---------|----------|
| 🆓 **Free Mode** | ×0.2 | Not required | Zero barrier, platform AI generates payloads |
| ⚡ **Efficient Mode** | ×1.0 | LLM API Key required | Bring your own LLM, 5x points, unlimited |

> 🔒 **Security**: In Efficient Mode, your API Key runs **locally only** — never uploaded to the platform.

---

## Quick Start: Mine in 3 Minutes

### Step 1: Launch the Miner

```bash
# Option A: npx one-liner (recommended)
npx @openshell-cc/miner-cli@latest setup
npx @openshell-cc/miner-cli@latest start

# Option B: Global install
npm install -g @openshell-cc/miner-cli
miner-cli setup
miner-cli start
```

First-time `setup` wizard guides you through configuration. **Free Mode only needs `SHELL_API_KEY`** — no GPU, no third-party LLM API Key, register and start mining.

### Step 2 (Optional): Upgrade to Efficient Mode

Set `LLM_API_KEY` in your `.env` and the miner auto-switches to Efficient Mode:

```bash
LLM_API_KEY=sk-ant-xxx   # Anthropic / OpenAI / DeepSeek / Gemini / Grok API Key
```

> Your API Key runs only on your local machine — never uploaded to any platform server.

### Step 3 (Optional): Bind Solana Wallet

Visit [openshell.cc](https://openshell.cc) dashboard to bind your Solana wallet. Future $SHELL tokens will be airdropped directly to your wallet.

---

## Configuration

Set the following in `packages/miner-cli/.env` (or generate via `setup` wizard):

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `ORACLE_URL` | Oracle server address | `https://oracle.openshell.cc` |
| `SHELL_API_KEY` | Miner key from dashboard | `sk-shell-...` |

### Optional (Efficient Mode)

| Variable | Description | Recommended |
|----------|-------------|-------------|
| `LLM_PROVIDER` | LLM provider | `anthropic` / `openai` / `deepseek` / `gemini` / `grok` |
| `LLM_API_KEY` | Provider API Key (runs locally) | — |
| `LLM_MODEL` | Specific model (optional) | See table below |
| `EXECUTION_MODE` | Execution mode | `sandbox_only` (default) / `auto` |

### Supported LLM Providers (Efficient Mode)

| Provider | `LLM_PROVIDER` | Recommended Model | Notes |
|----------|----------------|-------------------|-------|
| **Anthropic** | `anthropic` | `claude-haiku-4-5` | Fast, low cost |
| **OpenAI** | `openai` | `gpt-4o-mini` | General purpose |
| **DeepSeek** | `deepseek` | `deepseek-chat` | Cheapest, best value |
| **Google Gemini** | `gemini` | `gemini-2.5-flash` | Efficient reasoning |
| **xAI Grok** | `grok` | `grok-3-mini-fast` | Speed priority |
| **Custom** | Any name | Requires `LLM_MODEL` | Set `LLM_BASE_URL` (Ollama / vLLM / Together AI etc.) |

---

## Execution Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `sandbox_only` (default) | Platform AI generates payload, Oracle sandbox verifies | **Free Mode, zero API Key** |
| `auto` | Accepts both sandbox (attack + cross-validation) and local compute tasks | **Efficient Mode, with LLM API Key** |

---

## Tier System

Miners rank up based on attack records, higher tiers earn higher point multipliers:

| Tier | Requirements | Multiplier | Description |
|------|-------------|-----------|-------------|
| 🟢 **Scout** | Starting tier | **1x** | Basic difficulty tasks |
| 🟡 **Hunter** | 20+ attacks + 30%+ success rate | **3x** | Medium tasks, higher rewards |
| 🔴 **Apex** | 100+ attacks + 50%+ success rate | **10x** | Hardest tasks, 10x rewards |

Promotion is automatic — the system calculates your cumulative stats after each task.

---

## How Tasks Work

```
Miner A pulls task (GET /tasks/poll)
     ↓
Oracle assigns unlocked task (atomic lock, prevents race conditions)
     ↓
Generate attack payload (Free: platform AI / Efficient: local LLM)
     ↓
Miner A submits result (POST /tasks/submit)
     ↓
Oracle creates Peer verification round, dynamically assigns validators
(More online miners → more validators; violation history → more validators)
     ↓
Validator miners independently execute the same payload, vote: triggered / not_triggered
     ↓
Consensus resolution → auto-settlement when threshold reached
  Unanimous agreement → attacker + validators earn points
  Disagreement → enters arbitration queue
     ↓
Adaptive platform spot-check (more miners → lower spot-check rate)
(No consensus / timeout → platform fallback validator takes over)
```

---

## Dynamic Multi-Peer Cross-Validation

$SHELL Protocol uses a **Peer-First decentralized verification network**: miners vote first + platform spot-checks as needed + timeout fallback.

### Workflow

1. **Miner A completes attack** — submits result to Oracle
2. **Oracle creates verification round** — dynamically assigns validators (count adjusts based on online miners, task value, and submitter reputation)
3. **Validators independently execute** — each runs the same payload and submits their vote
4. **Consensus resolution** — auto-settles when threshold reached; disagreements enter arbitration
5. **Adaptive spot-check** — spot-check rate decreases as online miner count grows

### Dynamic Verification Features

| Feature | Mechanism |
|---------|-----------|
| **Validator count** | Adjusts by online miners + task value + submitter reputation |
| **Spot-check rate** | Adapts to online miner count (more miners → stronger peer network → fewer platform checks) |
| **Anti-cheat** | Cheaters require more validators for subsequent submissions |
| **Timeout fallback** | Validators timeout → platform fallback validator auto-takes over |

### Impact on Miners

- **Attack and validation tasks are indistinguishable** — miners participate transparently
- **Validation earns points too** — honest validators earn a percentage of the original task points; higher reputation = higher percentage
- **Escalating cheat penalties** — fabricating results resets reputation AND increases validator requirements for future submissions

---

## Target Agent Profiles (26)

The sandbox contains 26 AI Agent profiles covering three attack categories and four injection surfaces. The platform also auto-discovers trending real AI Agent projects from Twitter and GitHub.

### Platform Agents (DeFi / NFT / Cross-Chain / Payments)

| Category | Target Agents | Injection Surface |
|----------|--------------|-------------------|
| Meme Trading | Four.Meme, Pump.fun, Moonshot, GOAT | token_data / social_post |
| AI Agent Platforms | Virtuals Protocol, ai16z DAO, AIXBT | token_data / social_post |
| Smart Copy Trading | GMGN Smart Money Scanner | token_data |
| NFT Trading | Magic Eden NFT, Tensor NFT | token_data |
| Cross-Chain Bridge | LayerZero Bridge Agent | token_data |
| Payments | Circle USDC Payment Gateway | email |
| DeFi Lending | Kamino Lending Agent | token_data |
| AI Wallet | Griffain Wallet Agent | chat_message |
| Autonomous Agents | Olas, Fetch.ai Economic Agent | chat_message |
| Full-Chain Agent | Zerebro Full-Chain Agent | chat_message |
| Social Companion | MyShell.ai Companion Agent | chat_message |
| Decentralized ML | Bittensor Subnet Validator | token_data |

### Framework Agents (Command Injection / Privilege Escalation)

AI assistants with real tools. ElizaOS DeFi Agent and OpenClaw profiles use **9+ real tools** (`exec`, `bash`, `web_fetch`, `message`, `read`, `write`, `gateway`, `cron`, `memory_search`). Attackers break through sandbox defenses via privilege escalation and command injection.

### End-User Agents (Personal Trading / Portfolio)

Personal DeFi trading assistants and portfolio management agents simulating real user scenarios.

### Smart Model Rotation

Each target Agent runs on different LLM backends (GPT, Claude, Gemini, DeepSeek, Qwen, etc.). Higher model resistance = higher breach rewards. The Feed page shows `AgentName (ModelDisplayName)` format.

### Difficulty Levels

| Difficulty | Example Profiles | Defense Level |
|-----------|-----------------|---------------|
| Easy (12) | ElizaOS / AIXBT / Olas / GOAT / MyShell / LayerZero etc. | none (no injection defense) |
| Medium (8) | Pump.fun / Griffain / Tensor / Zerebro / Circle etc. | basic (basic safety rules) |
| Hard (6) | **OpenClaw Hardened** / Kamino / Fetch.ai / Bittensor etc. | advanced (explicit PI defense) |

---

## Miner Commands

```bash
# Initial setup wizard (first run)
miner-cli setup

# Start mining
miner-cli start

# Bind referral code on first registration
miner-cli start --referral <code>

# Check current status
miner-cli status
```

---

## Referral Program

- Share your referral link (available on dashboard)
- **8%** commission on referrals' mining output
- Commission lasts **30 days**
- Referral codes also increase Free Mode daily quota (+5/code)

**Get your link**: Login to [dashboard](https://openshell.cc/dashboard) → Copy referral link

---

## Honeypot Mechanism

To maintain mining quality, 5% of tasks are honeypots with obviously malicious prompts. A quality miner should recognize and skip them.

| Trigger Count | Penalty |
|--------------|---------|
| 1-3 times | ⚠️ Warning only |
| 4th time | -10% points |
| 5th time | -50% points |
| 6th+ | 🔴 100% points reset |

> Honeypot counter resets after 48 hours without triggers.

---

## Red Team Disclosure Policy

Successful breach payloads are published on the [Red Team Reports](https://openshell.cc/red-team) page following a three-tier disclosure system:

| Tier | Visibility | Content |
|------|-----------|---------|
| **Tier 1 — Public** | Everyone | Target agent, attack surface, model, high-level summary, triggered actions, time, defense level |
| **Tier 2 — Miners** | Logged-in users with ≥1 mining submission | Detailed attack metadata (task type, difficulty, miner tier, points) — **payload hidden** |
| **Tier 3 — Full Disclosure** | See below | Complete attack payload and PoC |

**Tier 3 access is granted when ANY of these conditions are met:**
- The agent is marked as **promoted** (officially disclosed by $SHELL)
- The individual report is past the **10-day disclosure window**
- The viewer has **successfully breached** the same agent

> This system balances transparency with responsible disclosure — showcasing results while protecting active attack surfaces.

---

## FAQ

**Q: What hardware do I need?**
A: Any device running Node.js (v18+). Free Mode requires no GPU or third-party API Key.

**Q: What's the difference between Free and Efficient Mode?**
A: Free Mode: ×0.2 points, daily limit. Efficient Mode: needs LLM API Key, ×1.0 points, unlimited. API Key runs locally only.

**Q: Do I need a Solana wallet?**
A: No. Register via email or CLI auto-registration, get `sk-shell-xxx` key from dashboard. Solana wallet is optional for future token claims.

**Q: How many points per successful attack?**
A: Base points calculated by task difficulty × tier multiplier (Scout 1x, Hunter 3x, Apex 10x) × mode multiplier (Free ×0.2, Efficient ×1.0) × model difficulty multiplier.

**Q: When will $SHELL go on-chain?**
A: Phase 5 (Solana contracts) is in development. Points earned now will convert to $SHELL tokens proportionally. **Bind your Solana wallet now** for direct airdrop.

**Q: Do validation tasks earn points?**
A: Yes! After each attack submission, other miners validate the result. **Honest validation earns points** (percentage of original task reward). Higher reputation = higher percentage.

**Q: Will I lose points for failed attacks?**
A: No point deduction for failed attacks. However, fabricating results resets reputation and increases validator requirements for future submissions.

**Q: Is my API Key safe in Efficient Mode?**
A: Completely safe. Your API Key runs only on your local machine — never uploaded to any server.

**Q: Which LLMs are supported?**
A: Anthropic, OpenAI, DeepSeek, Google Gemini, xAI Grok, and any OpenAI-compatible API (Ollama / vLLM / Together AI etc.). DeepSeek recommended for simple tasks (cheapest); Claude for hard tasks.

---

## Security Policy

We only reward contributions that are:
- First discovered, first disclosed
- Reproducible with complete documentation
- Follow responsible disclosure principles

**The gold belongs to those who play by the rules.**

Unauthorized on-chain operations, fund transfers, or destructive attacks result in permanent ban and deposit forfeiture.

---

## Repository Structure

```
shell-protocol/
├── packages/
│   ├── miner-cli/     # Miner CLI tool (npm published)
│   └── web/           # Official website frontend (Vue 3 + Vite)
```

> **Note**: Oracle (backend server) and Sandbox (verification engine) are in a private repository.

---

## Contributing

```bash
# Clone the repo
git clone https://github.com/openshell-cc/shell-protocol.git
cd shell-protocol

# Install dependencies (requires pnpm)
pnpm install

# Start frontend dev server
pnpm --filter @shell/web dev

# Start miner dev mode
pnpm --filter @openshell-cc/miner-cli dev -- start
```

Issues and PRs welcome!

---

## Links

- 🌐 Website: [openshell.cc](https://openshell.cc)
- 📦 npm: [@openshell-cc/miner-cli](https://www.npmjs.com/package/@openshell-cc/miner-cli)
- 🔐 Disclosures: [openshell.cc/disclosures](https://openshell.cc/disclosures)
- 🔴 Red Team Reports: [openshell.cc/red-team](https://openshell.cc/red-team)
- 🐦 X: [@openshell_cc](https://x.com/openshell_cc)
- 💻 GitHub: [openshell-cc](https://github.com/openshell-cc)

---

## Protocol Wallets

Official protocol-controlled wallets for future onchain operations, reward distribution, and ecosystem transparency.

| Chain | Address |
|-------|---------|
| **EVM** (Ethereum / BSC / Polygon …) | `0xf1c1ef080e6aE6AABA999ba6E5D1545cD5Efab41` |
| **Solana** | `BrGihgGjCmpu2p96rou6GQj3sQpwgeud937jf4RvZP9G` |

---

<p align="center">
  Built by <a href="https://github.com/openshell-cc">openshell-cc</a> · Zero barrier free mining · Bring your own LLM for 5x points
</p>
