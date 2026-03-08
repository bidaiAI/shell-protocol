#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { createInterface } from 'node:readline'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadConfig, validateConfig, isFirstRun, isPlatformManaged, getSupportedTaskModes, getDeviceFingerprint, getRandomPollInterval, getPollIntervalLabel, type MinerConfig } from './config.js'
import { autoAuthenticate, type AuthResult } from './auth.js'
import { pollForTask, requestPayloadFromOracle, submitPayload, submitLocalComputeResult, pollSubmissionResult, type TaskData, type SubmitResult } from './poller.js'
import { executeLocally } from './local-sandbox/executor.js'
import { buildSubmissionBody } from './local-sandbox/proof.js'

const BANNER = chalk.cyan(`
  ███████╗██╗  ██╗███████╗██╗     ██╗
  ██╔════╝██║  ██║██╔════╝██║     ██║
  ███████╗███████║█████╗  ██║     ██║
  ╚════██║██╔══██║██╔══╝  ██║     ██║
  ███████║██║  ██║███████╗███████╗███████╗
  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝
`)

const program = new Command()

program
  .name('shell-miner')
  .description('$SHELL Protocol Miner CLI — Mine $SHELL by red-teaming AI agents')
  .version('0.3.0')

// ── Setup command (interactive first-run wizard) ──────────────────────────────

program
  .command('setup')
  .description('Interactive setup wizard — configure your miner in 2 minutes')
  .action(async () => {
    console.log(BANNER)
    console.log(chalk.cyan('  Miner Setup Wizard'))
    console.log()
    console.log(chalk.gray('  This wizard will create a .env file with your configuration.'))
    console.log()

    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const ask = (question: string): Promise<string> =>
      new Promise(resolve => rl.question(question, resolve))

    const oracleUrl = process.env.ORACLE_URL || 'https://oracle.openshell.cc'
    let shellApiKey = ''

    // Step 1: Auth — auto-register or paste existing key
    console.log(chalk.bold('Step 1: 获取你的 $SHELL 密钥'))
    console.log(chalk.gray('  1) 自动注册（推荐，一键完成）'))
    console.log(chalk.gray('  2) 已有密钥（手动粘贴 sk-shell-xxx）'))
    console.log()
    const authChoice = (await ask(chalk.white('  选择 [1]: '))).trim() || '1'

    if (authChoice === '2') {
      // Manual: paste existing key
      console.log()
      console.log(chalk.gray('  前往 https://openshell.cc → 注册 → 控制面板 → Agent 注册'))
      shellApiKey = (await ask(chalk.white('  SHELL_API_KEY (sk-shell-xxx): '))).trim()
    } else {
      // Auto-register
      console.log()
      const regSpinner = ora('Registering with Oracle...').start()
      try {
        const deviceFp = getDeviceFingerprint()
        const res = await fetch(`${oracleUrl}/auth/cli-register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceFingerprint: deviceFp }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
          throw new Error(err.error || `HTTP ${res.status}`)
        }

        const data = await res.json() as {
          apiKey: string
          user: { agentName: string; referralCode: string; miningAccessEnabled: boolean }
        }
        shellApiKey = data.apiKey
        regSpinner.succeed(`Registered as ${chalk.green(data.user.agentName)}`)
        console.log(chalk.gray(`  API Key: ${shellApiKey}`))
        console.log(chalk.gray(`  Referral Code: ${data.user.referralCode}`))
        console.log(chalk.yellow('  ⚠ Save this API key! It will NOT be shown again.'))
      } catch (err) {
        regSpinner.fail(`Registration failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        console.log()
        console.log(chalk.gray('  You can manually paste an existing key instead:'))
        shellApiKey = (await ask(chalk.white('  SHELL_API_KEY (sk-shell-xxx): '))).trim()
      }
    }

    // Step 2: Invite code (optional — increases daily free limit)
    console.log()
    console.log(chalk.bold('Step 2: 邀请码（可选）'))
    console.log(chalk.gray('  有邀请码？输入后可增加每日免费额度'))
    console.log(chalk.gray('  没有邀请码？直接回车跳过，注册即可免费挖矿'))
    console.log()
    const inviteCode = (await ask(chalk.white('  邀请码（留空跳过）: '))).trim()

    if (inviteCode && shellApiKey) {
      const inviteSpinner = ora('Redeeming invite code...').start()
      try {
        const res = await fetch(`${oracleUrl}/auth/redeem-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${shellApiKey}`,
          },
          body: JSON.stringify({ inviteCode }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
          throw new Error(err.error || `HTTP ${res.status}`)
        }

        inviteSpinner.succeed(chalk.green('Daily free limit increased! +5 submissions/day'))
      } catch (err) {
        inviteSpinner.fail(`Invite code failed: ${err instanceof Error ? err.message : 'Unknown'}`)
        console.log(chalk.gray('  You can try again later, or share your own referral code to earn points.'))
      }
    } else if (!inviteCode) {
      console.log(chalk.cyan('  ℹ 已跳过。无需邀请码即可开始免费挖矿！'))
    }

    // Step 3: Mining mode selection
    console.log()
    console.log(chalk.bold('Step 3: 挖矿模式'))
    console.log()
    console.log(chalk.cyan('  🆓 免费模式') + chalk.gray(' — 直接回车，零 API Key，积分 ×0.2，每日有限次数'))
    console.log(chalk.cyan('  ⚡ 高效模式') + chalk.gray(' — 填写 LLM API Key，积分 ×1.0，无次数限制'))
    console.log()
    console.log(chalk.green('  🔒 安全保证：API Key 仅在本地运行，不上传平台，完全安全'))
    console.log()
    const llmApiKey = (await ask(chalk.white('  LLM_API_KEY（留空 = 免费模式）: '))).trim()

    let llmProvider = 'anthropic'
    if (llmApiKey) {
      if (llmApiKey.startsWith('sk-proj-')) llmProvider = 'openai'
      else if (llmApiKey.startsWith('sk-ant-') || llmApiKey.startsWith('sk-')) llmProvider = 'anthropic'
      else {
        console.log()
        console.log(chalk.gray('  LLM provider: 1) Anthropic  2) OpenAI  3) DeepSeek'))
        const pChoice = (await ask(chalk.white('  Choose [1]: '))).trim() || '1'
        llmProvider = { '1': 'anthropic', '2': 'openai', '3': 'deepseek' }[pChoice] || 'anthropic'
      }
    }

    rl.close()

    // Write .env
    const envPath = resolve(process.cwd(), '.env')
    const miningMode = llmApiKey ? 'self_llm' : 'free'
    const envContent = [
      '# $SHELL Miner Configuration — generated by shell-miner setup',
      '',
      '# Oracle endpoint',
      `ORACLE_URL=${oracleUrl}`,
      '',
      '# Authentication',
      shellApiKey ? `SHELL_API_KEY=${shellApiKey}` : '# SHELL_API_KEY=sk-shell-...',
      '# WALLET_PRIVATE_KEY=  # 可选：Solana 钱包',
      '',
      '# LLM (高效模式) — API Key 仅本地使用，不上传平台',
      llmApiKey ? `LLM_PROVIDER=${llmProvider}` : '# LLM_PROVIDER=anthropic',
      llmApiKey ? `LLM_API_KEY=${llmApiKey}` : '# LLM_API_KEY=',
      '',
      '# Mining mode: free (×0.2 pts) or self_llm (×1.0 pts)',
      `EXECUTION_MODE=${llmApiKey ? 'auto' : 'sandbox_only'}`,
      `# Mining mode auto-detected: ${miningMode}`,
      '# Polling interval auto-adjusted by mode (no need to set manually)',
    ].join('\n')

    writeFileSync(envPath, envContent)
    console.log()
    console.log(chalk.green('  ✓ Configuration saved to .env'))
    console.log()
    console.log(chalk.cyan('  Start mining:'), chalk.white('npx @openshell-cc/miner-cli start'))
    console.log()
  })

// ── Start command ─────────────────────────────────────────────────────────────

program
  .command('start')
  .description('Start mining (authenticate, poll tasks, generate payloads, submit)')
  .option('-r, --referral <code>', 'Referral code from another miner')
  .action(async (opts) => {
    const config = loadConfig()

    // First-run: guide user to setup wizard
    if (isFirstRun(config)) {
      console.log(BANNER)
      console.log(chalk.yellow('  未找到配置文件！'))
      console.log()
      console.log(chalk.white('  运行配置向导（2 分钟完成）：'))
      console.log(chalk.cyan('    npx @openshell-cc/miner-cli setup'))
      console.log()
      console.log(chalk.gray('  或手动创建 .env 文件：'))
      console.log(chalk.gray('    SHELL_API_KEY=sk-shell-xxx  ← 在 https://openshell.cc/dashboard 获取'))
      console.log(chalk.gray('    # LLM_API_KEY=sk-ant-...  ← 可选，仅用于高级本地计算模式'))
      console.log(chalk.gray('    ORACLE_URL=https://oracle.openshell.cc'))
      console.log()
      process.exit(0)
    }

    const errors = validateConfig(config)
    if (errors.length > 0) {
      console.error(chalk.red('\n  Configuration errors:\n'))
      errors.forEach(e => {
        const lines = e.split('\n')
        console.error(chalk.red(`  ✗ ${lines[0]}`))
        lines.slice(1).forEach(l => console.error(chalk.gray(`    ${l}`)))
      })
      console.error()
      console.error(chalk.gray('  Run `npx @openshell-cc/miner-cli setup` to configure interactively.'))
      console.error()
      process.exit(1)
    }

    console.log(BANNER)
    console.log(chalk.cyan('  Decentralized AI Red Team Network'))
    const authMethod = config.shellApiKey ? 'API Key' : 'Solana Wallet'
    const miningModeLabel = config.miningMode === 'self_llm'
      ? chalk.magenta('⚡ 高效模式') + chalk.gray(` (${config.llmProvider}/${config.llmModel}, ×1.0 积分)`)
      : chalk.cyan('🆓 免费模式') + chalk.gray(' (×0.2 积分)')
    const pollLabel = getPollIntervalLabel(config.miningMode)
    console.log(chalk.gray(`  Oracle:  ${config.oracleUrl}`))
    console.log(chalk.gray(`  Auth:    ${authMethod}`))
    console.log(`  ${chalk.gray('Mode:')}   ${miningModeLabel}`)
    console.log(chalk.gray(`  Poll:    ${pollLabel}`))
    if (config.miningMode === 'free') {
      console.log(chalk.gray('  ') + chalk.green('✓') + chalk.gray(' 零 API Key 免费挖矿，平台 AI 生成 payload'))
      console.log(chalk.gray('  ') + chalk.yellow('→') + chalk.gray(' 升级到高效模式：设置 LLM_API_KEY 环境变量（Key 仅本地使用，不上传平台）'))
    } else {
      console.log(chalk.gray('  ') + chalk.green('✓') + chalk.gray(' 高效模式已启用，API Key 仅在本地运行，不上传平台，完全安全'))
    }
    console.log()

    // Authenticate
    const authSpinner = ora('Authenticating with Oracle...').start()
    let token: string
    let user: AuthResult['user']

    try {
      const result = await autoAuthenticate(config, opts.referral)
      token = result.token
      user = result.user
      const identity = user.agentName || (user.walletAddress ? `${user.walletAddress.slice(0, 8)}...` : 'unknown')
      authSpinner.succeed(
        `Authenticated as ${chalk.green(identity)} | Tier: ${chalk.yellow(user.tier)} | Points: ${chalk.cyan(user.shellPoints)}`,
      )
      console.log(chalk.gray(`  Your referral code: ${user.referralCode}`))
    }
    catch (err) {
      authSpinner.fail(`Authentication failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      process.exit(1)
    }

    console.log()
    console.log(chalk.green('  Mining started.'), chalk.gray('Press Ctrl+C to stop.'))
    if (config.miningMode === 'free') {
      console.log()
      console.log(chalk.yellow('  💡 提升成功率: 配置 LLM_API_KEY 解锁高级攻击模式'))
      console.log(chalk.gray('     在 .env 中设置 LLM_API_KEY (支持 Anthropic/OpenAI/DeepSeek/Gemini/xAI 等)'))
      console.log(chalk.gray('     自带 LLM → 更强模型 → 更高攻破率 → 5x 积分倍率'))
    }
    console.log()

    // Mining loop
    let totalTasks = 0
    let totalSuccess = 0
    let totalPoints = 0
    let consecutiveFails = 0

    while (true) {
      const pollSpinner = ora('Polling for tasks...').start()

      try {
        const task = await pollForTask(config, token, getSupportedTaskModes(config), config.miningMode)

        if (!task) {
          pollSpinner.info('No tasks available. Waiting...')
          await sleep(config.pollingIntervalMs)
          continue
        }

        const isLocalCompute = task.executionMode === 'local_compute'
        const modeTag = isLocalCompute ? chalk.magenta('[LOCAL]') : chalk.blue('[SANDBOX]')

        pollSpinner.succeed(`${modeTag} Task: ${chalk.yellow(task.taskType)} | Chain: ${chalk.blue(task.targetChain)} | Difficulty: ${'★'.repeat(task.difficulty)} | Reward: ${chalk.cyan(task.rewardPoints)} pts`)

        // Execution mode routing
        if (config.executionMode === 'sandbox_only' && isLocalCompute) {
          console.log(chalk.gray('  [sandbox_only] Skipping local_compute task...'))
          await sleep(config.pollingIntervalMs)
          continue
        }

        let result: SubmitResult

        if (isLocalCompute) {
          result = await handleLocalCompute(config, token, task)
        }
        else {
          result = await handleSandboxVerified(config, token, task)
        }

        totalTasks++

        if (result.result === 'success') {
          totalSuccess++
          consecutiveFails = 0
          totalPoints += result.pointsAwarded ?? 0
          console.log(chalk.green(`  ✓ Attack successful! +${result.pointsAwarded} pts`))
          if (config.miningMode === 'free') {
            console.log(chalk.yellow(`  💡 配置 LLM_API_KEY 可获得 5x 积分倍率！本地运行，密钥安全不上传`))
          }
        }
        else if (result.result === 'slashed') {
          consecutiveFails++
          console.log(chalk.red(`  ✗ SLASHED! ${result.message}`))
        }
        else if (result.result === 'failed') {
          consecutiveFails++
          console.log(chalk.red(`  ✗ Failed: ${result.message}`))
          if (config.miningMode === 'free') {
            console.log(chalk.yellow(`  💡 配置 LLM_API_KEY 使用更强模型，大幅提升攻破成功率！密钥仅本地使用，安全不上传`))
          }
        }
        else {
          const spotTag = result.spotCheckSelected ? chalk.yellow(' [spot-check pending]') : ''
          console.log(chalk.gray(`  ~ Submitted for verification.${spotTag}`))
        }

        const rate = totalTasks > 0 ? (totalSuccess / totalTasks * 100).toFixed(1) : '0.0'
        const miningTag = config.miningMode === 'self_llm' ? '⚡' : '🆓'
        console.log(chalk.gray(`  [${miningTag} Stats] Tasks: ${totalTasks} | Success: ${totalSuccess} (${rate}%) | Total pts: ${totalPoints}`))
        console.log()
      }
      catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown'

        // Mining access restricted (banned)
        if (errMsg === 'MINING_ACCESS_RESTRICTED') {
          pollSpinner.fail(chalk.yellow('Mining access not yet enabled for your account'))
          console.log(chalk.cyan('  ✓ Your account is logged in successfully'))
          console.log(chalk.cyan('  ✗ Mining access has not been enabled yet'))
          console.log(chalk.cyan('  → Visit your Dashboard to check status, or contact the admin'))
          console.log(chalk.cyan('  → Dashboard: https://openshell.cc'))
          console.log()
          console.log(chalk.gray('  Retrying in 60 seconds...'))
          await sleep(60_000)
          continue
        }

        // Free mode: IP already in use by another miner
        if (errMsg.startsWith('FREE_MODE_IP_LIMIT')) {
          const hint = errMsg.split(':').slice(1).join(':').trim()
          pollSpinner.fail(chalk.yellow('Free mode IP limit: another free miner is already using this IP'))
          if (hint) console.log(chalk.gray(`  ℹ ${hint}`))
          console.log(chalk.cyan('  → 解决方案: 在 .env 中配置 LLM_API_KEY 升级到⚡高效模式'))
          console.log(chalk.cyan('  → 高效模式无 IP 限制，更强模型，5x 积分！'))
          console.log(chalk.gray('  → 密钥仅在你本地运行，绝不上传到平台'))
          console.log()
          console.log(chalk.gray('  Retrying in 5 minutes...'))
          await sleep(5 * 60_000)
          continue
        }

        // Free mode: daily limit reached
        if (errMsg === 'FREE_MODE_DAILY_LIMIT') {
          pollSpinner.info(chalk.yellow('Free mode daily limit reached'))
          console.log(chalk.cyan('  → Today\'s free submissions used up, come back tomorrow!'))
          console.log(chalk.cyan('  → Or upgrade to ⚡ 高效模式: set LLM_API_KEY for unlimited mining'))
          console.log()
          console.log(chalk.gray('  Retrying in 30 minutes...'))
          await sleep(30 * 60_000)
          continue
        }

        pollSpinner.fail(`Error: ${errMsg}`)

        if (err instanceof Error && (errMsg.includes('Token expired') || errMsg.includes('re-authenticate') || errMsg.includes('Invalid or expired'))) {
          if (config.walletPrivateKey) {
            console.log(chalk.yellow('  Re-authenticating...'))
            try {
              const result = await autoAuthenticate(config, opts.referral)
              token = result.token
              console.log(chalk.green('  Re-authenticated successfully'))
            }
            catch (authErr) {
              console.error(chalk.red(`  Re-auth failed: ${authErr instanceof Error ? authErr.message : 'Unknown'}`))
            }
          } else {
            // API key users can't re-auth — key is likely revoked
            console.log(chalk.red('  API key may be invalid or revoked. Please check your configuration.'))
          }
        }
      }

      // Use a fresh random interval each cycle for free mode jitter
      const nextInterval = getRandomPollInterval(config.miningMode)
      await sleep(nextInterval)
    }
  })

// ── Status command ────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Check your mining stats and recent submissions')
  .option('-n, --recent <count>', 'Number of recent submissions to show', '5')
  .action(async (opts) => {
    const config = loadConfig()
    const errors = validateConfig(config)
    if (errors.length > 0) {
      console.error(chalk.red('Configuration error — run `setup` first.'))
      process.exit(1)
    }

    const spinner = ora('Fetching stats...').start()
    try {
      const { token, user } = await autoAuthenticate(config)
      const recentCount = Math.min(Math.max(Number(opts.recent) || 5, 1), 20)

      // Fetch leaderboard stats + recent submissions in parallel
      const [statsRes, subsRes] = await Promise.all([
        fetch(`${config.oracleUrl}/leaderboard/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Device-Fingerprint': getDeviceFingerprint(),
          },
        }),
        fetch(`${config.oracleUrl}/tasks/my-submissions?limit=${recentCount}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Device-Fingerprint': getDeviceFingerprint(),
          },
        }),
      ])

      const data = await statsRes.json() as Record<string, unknown>
      const subsData = subsRes.ok
        ? await subsRes.json() as { submissions: Array<Record<string, unknown>> }
        : { submissions: [] }
      spinner.stop()

      const identity = user.agentName || (user.walletAddress ? `${user.walletAddress.slice(0, 8)}...` : 'Agent')
      console.log()
      console.log(chalk.cyan('$SHELL Miner Status'))
      console.log(chalk.gray('─'.repeat(50)))
      console.log(chalk.white('  Identity:   '), chalk.green(identity))
      console.log(chalk.white('  Tier:       '), chalk.yellow(String(data.tier ?? user.tier)))
      console.log(chalk.white('  Points:     '), chalk.cyan(String(data.shellPoints ?? user.shellPoints)))
      console.log(chalk.white('  Success:    '), String(data.totalSuccessfulAttacks ?? '—'), '/', String(data.totalTasksCompleted ?? '—'))
      console.log(chalk.white('  Rate:       '), String(data.successRate ?? '—'))
      console.log(chalk.white('  Referral:   '), String(data.referralCode ?? user.referralCode))

      // Recent submissions
      const subs = subsData.submissions
      if (subs.length > 0) {
        console.log()
        console.log(chalk.gray(`  Recent Submissions (last ${subs.length})`))
        console.log(chalk.gray('  ' + '─'.repeat(48)))
        for (const sub of subs) {
          const valid = sub.isValid as boolean
          const verified = sub.verifiedAt != null
          const pending = !verified
          const pts = Number(sub.pointsAwarded ?? 0)
          const mode = String(sub.executionMode ?? 'sandbox')
          const settleStatus = String(sub.settlementStatus ?? '')
          const submitted = sub.submittedAt ? new Date(sub.submittedAt as string).toLocaleString() : '—'

          let statusIcon: string
          let statusText: string
          if (pending) {
            statusIcon = chalk.yellow('⏳')
            statusText = chalk.yellow('验证中')
          } else if (valid && settleStatus === 'settled') {
            statusIcon = chalk.green('✓')
            statusText = chalk.green(`成功 +${pts} pts`)
          } else if (valid && settleStatus === 'pending') {
            statusIcon = chalk.cyan('⏳')
            statusText = chalk.cyan(`结算中 (${pts} pts 待发)`)
          } else if (valid) {
            statusIcon = chalk.green('✓')
            statusText = chalk.green(`+${pts} pts`)
          } else {
            statusIcon = chalk.red('✗')
            statusText = chalk.red('未触发 canary')
          }
          const modeTag = mode === 'local_compute' ? chalk.magenta('[L]') : chalk.blue('[S]')
          console.log(`  ${statusIcon} ${modeTag} ${statusText.padEnd(24)} ${chalk.gray(submitted)}`)
        }
      }
      console.log()
    }
    catch (err) {
      spinner.fail(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      process.exit(1)
    }
  })

// ── Prevent silent crashes ────────────────────────────────────────────────────

process.on('unhandledRejection', (err) => {
  console.error(chalk.red('Unhandled error:'), err)
})

program.parse()

// ── Helpers ───────────────────────────────────────────────────────────────────

async function handleLocalCompute(
  config: ReturnType<typeof loadConfig>,
  token: string,
  task: TaskData,
): Promise<SubmitResult> {
  const genSpinner = ora('Requesting attack payload from Oracle...').start()
  const response = await requestPayloadFromOracle(config, token, task.id)
  const { payload } = response
  const sourceTag = response.source === 'cache' ? ' (cached)' : ''
  genSpinner.succeed(`Platform AI generated payload (${payload.length} chars)${sourceTag}`)

  const execSpinner = ora('Executing locally against target agent...').start()
  const executionResult = await executeLocally(
    config,
    task.targetAgentProfile,
    payload,
    task.mockToolDefinitions,
  )
  const totalTokens = executionResult.tokensUsed.input + executionResult.tokensUsed.output
  execSpinner.succeed(
    `Local execution: ${executionResult.actionLog.length} actions, ${executionResult.rounds} rounds, ${totalTokens} tokens`,
  )

  if (!task.challengeNonce) {
    throw new Error('Task missing challengeNonce — cannot submit local_compute result without it')
  }

  const subSpinner = ora('Submitting result...').start()
  const body = buildSubmissionBody(
    task.id,
    payload,
    task.challengeNonce,
    executionResult,
    config,
  )
  const result = await submitLocalComputeResult(config, token, body)
  subSpinner.stop()
  return result
}

async function handleSandboxVerified(
  config: ReturnType<typeof loadConfig>,
  token: string,
  task: TaskData,
): Promise<SubmitResult> {
  const genSpinner = ora('Generating attack payload...').start()
  const response = await requestPayloadFromOracle(config, token, task.id)
  const { payload, payloadHash } = response
  const sourceTag = response.source === 'cache' ? ' (cached)' : ''
  genSpinner.succeed(`Platform AI generated payload (${payload.length} chars)${sourceTag}`)

  const subSpinner = ora('Submitting to Oracle sandbox...').start()
  const submitResult = await submitPayload(config, token, task.id, payload, payloadHash)
  subSpinner.stop()

  // P1a: If submission is queued for async verification, poll for the real result
  if (submitResult.result === 'submitted' && submitResult.submissionId) {
    const pollSpinner = ora('Sandbox verifying... (up to 120s)').start()
    const final = await pollSubmissionResult(config, token, submitResult.submissionId)
    pollSpinner.stop()

    if (!final || final.status === 'infra_error') {
      // Timed out or infra error — return the original submitted result so the
      // caller shows "Submitted for verification" rather than a false failure
      console.log(chalk.gray('  ℹ Verification still pending — check back with `shell-miner status`'))
      return submitResult
    }

    // Map SubmissionResult → SubmitResult shape for unified display
    return {
      result: final.isValid ? 'success' : 'failed',
      message: final.isValid
        ? `Sandbox verified! Attack successful.`
        : `Sandbox did not detect a canary trigger.`,
      pointsAwarded: final.pointsAwarded ?? 0,
      submissionId: final.submissionId,
      spotCheckSelected: final.spotCheckSelected,
    }
  }

  return submitResult
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
