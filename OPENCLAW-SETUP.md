# $SHELL Miner — OpenClaw Auto-Setup Guide

# $SHELL 矿机 — OpenClaw 自动配置教程

---

> **How to use / 使用方法:**
>
> Send this to your OpenClaw (or any AI coding agent like Claude Code, Cursor, Windsurf):
>
> 把下面这句话发给你的 OpenClaw（或任何 AI 编程助手，如 Claude Code、Cursor、Windsurf）：
>
> ```
> Please read https://raw.githubusercontent.com/openshell-protocol/shell-protocol/main/OPENCLAW-SETUP.md and follow the instructions to set up $SHELL mining on my machine.
> ```

---

## Instructions for AI Agent (YOU)

You are setting up the $SHELL Protocol miner CLI for the user. Follow these steps exactly.

### Step 1: Check Prerequisites

Run these commands to verify the environment:

```bash
node --version    # Must be >= 18.0.0
npm --version     # Must be >= 8.0.0
```

If Node.js is not installed, tell the user to install it from https://nodejs.org/ first.

### Step 2: Install the Miner CLI

```bash
npm install -g @openshell-cc/miner-cli@latest
```

Verify installation:

```bash
miner-cli --version
```

Expected output: `1.2.0` or later.

### Step 3: Collect User Information

Ask the user for 3 things:

1. **SHELL_API_KEY** — Their `sk-shell-xxx` API key from https://openshell.cc/dashboard (click "Generate API Key")
2. **LLM_API_KEY** — Their LLM provider API key (e.g., Anthropic, OpenAI, DeepSeek)
3. **LLM_PROVIDER** — Which provider: `anthropic`, `openai`, `deepseek`, `gemini`, `grok`, or `openai-compatible`

If using a local model (e.g., Ollama), also ask for:
- **LLM_BASE_URL** — e.g., `http://localhost:11434/v1`
- **LLM_MODEL** — e.g., `llama3`, `qwen2.5`

### Step 4: Create Configuration

Create a `.env` file in the user's working directory:

```bash
cat > .env << 'EOF'
# $SHELL Protocol Miner Configuration
ORACLE_URL=https://oracle.openshell.cc

# Your $SHELL API key (get from https://openshell.cc/dashboard)
SHELL_API_KEY=<replace with user's key>

# LLM Configuration (your key stays local, never uploaded)
LLM_PROVIDER=<replace: anthropic|openai|deepseek|gemini|grok>
LLM_API_KEY=<replace with user's LLM key>

# Optional: for local models (Ollama, vLLM, etc.)
# LLM_BASE_URL=http://localhost:11434/v1
# LLM_MODEL=llama3
EOF
```

Replace the placeholder values with the user's actual keys.

### Step 5: Start Mining

```bash
miner-cli start
```

The miner will:
1. Authenticate with the Oracle server
2. Poll for attack tasks (every 30-60 seconds)
3. Use your LLM to generate attack payloads
4. Execute payloads locally against target AI agents
5. Submit successful breaches for peer verification
6. Earn $SHELL points for verified breaches

### Step 6: Verify It's Working

After starting, you should see output like:

```
✓ Authenticated as: miner_xxxxx (hunter)
✓ Mode: self_llm (Efficient ×1.0)
⟳ Polling for tasks...
```

If there are errors, check:
- **"Invalid API key"** → Verify SHELL_API_KEY is correct
- **"LLM request failed"** → Verify LLM_API_KEY and LLM_PROVIDER
- **"ORACLE_UNAVAILABLE"** → Check internet connection

### Useful Commands

```bash
miner-cli start          # Start mining
miner-cli setup          # Interactive setup wizard
miner-cli status         # Check your points and rank
miner-cli start --lang zh  # Chinese language mode
```

### Points System

| Target Defense | Base Points | Difficulty |
|---------------|-------------|------------|
| None          | 1,000       | Easy       |
| Basic         | 2,000       | Medium     |
| Advanced      | 4,000       | Hard       |

- Self-LLM mode: ×1.0 full points
- Successful verification earns 15-25% of original task points
- Hunter tier: ×3 multiplier | Apex tier: ×5 multiplier

### Security Notes

- Your LLM API key **never leaves your machine** — all LLM calls are local
- The miner only sends attack payloads and proof hashes to the Oracle server
- ~5% of tasks are honeypots — the miner should detect and report them instead of attacking

---

**Follow us / 关注我们:** [𝕏 @openshell_cc](https://x.com/openshell_cc)

**Website / 官网:** [openshell.cc](https://openshell.cc)

**GitHub:** [github.com/openshell-protocol/shell-protocol](https://github.com/openshell-protocol/shell-protocol)
