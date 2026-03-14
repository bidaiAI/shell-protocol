#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { createInterface } from 'node:readline'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadConfig, validateConfig, isFirstRun, isPlatformManaged, getSupportedTaskModes, getDeviceFingerprint, getRandomPollInterval, getPollIntervalLabel, CLIENT_VERSION, type MinerConfig } from './config.js'
import { autoAuthenticate, type AuthResult } from './auth.js'
import { pollForTask, submitLocalComputeResult, type TaskData, type SubmitResult } from './poller.js'
import { executeLocally } from './local-sandbox/executor.js'
import { buildSubmissionBody } from './local-sandbox/proof.js'
import { generatePayloadLocally } from './local-sandbox/payload-generator.js'
import { T } from './i18n.js'

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
  .version(CLIENT_VERSION)

// ── Setup command (interactive first-run wizard) ──────────────────────────────

program
  .command('setup')
  .description('Interactive setup wizard — configure your miner in 2 minutes')
  .action(async () => {
    console.log(BANNER)
    console.log(chalk.cyan(`  ${T('setupTitle')}`))
    console.log()
    console.log(chalk.gray(`  ${T('setupDesc')}`))
    console.log()

    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const ask = (question: string): Promise<string> =>
      new Promise(resolve => rl.question(question, resolve))

    const oracleUrl = process.env.ORACLE_URL || 'https://oracle.openshell.cc'
    let shellApiKey = ''

    // Step 1: Auth — auto-register or paste existing key
    console.log(chalk.bold(T('step1Title')))
    console.log(chalk.gray(`  ${T('step1Auto')}`))
    console.log(chalk.gray(`  ${T('step1Manual')}`))
    console.log()
    const authChoice = (await ask(chalk.white(`  ${T('step1Choose')}`))).trim() || '1'

    if (authChoice === '2') {
      // Manual: paste existing key
      console.log()
      console.log(chalk.gray(`  ${T('step1ManualGuide')}`))
      shellApiKey = (await ask(chalk.white('  SHELL_API_KEY (sk-shell-xxx): '))).trim()
    } else {
      // Auto-register
      console.log()
      const regSpinner = ora(T('registering')).start()
      try {
        const deviceFp = getDeviceFingerprint()
        const res = await fetch(`${oracleUrl}/auth/cli-register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Fingerprint': deviceFp,
            'X-Client-Version': CLIENT_VERSION,
          },
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
        console.log(chalk.yellow(`  ${T('saveKeyWarn')}`))
      } catch (err) {
        regSpinner.fail(`${T('regFailed')}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        console.log()
        console.log(chalk.gray(`  ${T('manualKeyFallback')}`))
        shellApiKey = (await ask(chalk.white('  SHELL_API_KEY (sk-shell-xxx): '))).trim()
      }
    }

    // Step 2: Invite code (optional — increases daily free limit)
    console.log()
    console.log(chalk.bold(T('step2Title')))
    console.log(chalk.gray(`  ${T('step2Desc')}`))
    console.log(chalk.gray(`  ${T('step2Skip')}`))
    console.log()
    const inviteCode = (await ask(chalk.white(`  ${T('step2Prompt')}`))).trim()

    if (inviteCode && shellApiKey) {
      const inviteSpinner = ora(T('redeemingInvite')).start()
      try {
        const res = await fetch(`${oracleUrl}/auth/redeem-invite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${shellApiKey}`,
            'X-Device-Fingerprint': getDeviceFingerprint(),
            'X-Client-Version': CLIENT_VERSION,
          },
          body: JSON.stringify({ inviteCode }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
          throw new Error(err.error || `HTTP ${res.status}`)
        }

        inviteSpinner.succeed(chalk.green(T('inviteSuccess')))
      } catch (err) {
        inviteSpinner.fail(`${T('inviteFailed')}: ${err instanceof Error ? err.message : 'Unknown'}`)
        console.log(chalk.gray(`  ${T('inviteRetryHint')}`))
      }
    } else if (!inviteCode) {
      console.log(chalk.cyan(`  ℹ ${T('inviteSkipped')}`))
    }

    // Step 3: Mining mode selection
    console.log()
    console.log(chalk.bold(T('step3Title')))
    console.log()
    console.log(chalk.cyan(`  ${T('step3Free')}`))
    console.log(chalk.cyan(`  ${T('step3Adv')}`))
    console.log()
    console.log(chalk.green(`  ${T('step3Security')}`))
    console.log()
    const llmApiKey = (await ask(chalk.white(`  ${T('step3Prompt')}`))).trim()

    let llmProvider = 'anthropic'
    if (llmApiKey) {
      // Auto-detect by key prefix
      if (llmApiKey.startsWith('sk-proj-')) llmProvider = 'openai'
      else if (llmApiKey.startsWith('sk-ant-')) llmProvider = 'anthropic'
      else if (llmApiKey.startsWith('AIza')) llmProvider = 'gemini'
      else if (llmApiKey.startsWith('xai-')) llmProvider = 'grok'
      else if (llmApiKey.startsWith('sk-')) llmProvider = 'deepseek'
      else {
        console.log()
        console.log(chalk.gray(`  ${T('providerTitle')}`))
        console.log(chalk.gray('    1) Anthropic (Claude)'))
        console.log(chalk.gray('    2) OpenAI (GPT)'))
        console.log(chalk.gray('    3) DeepSeek'))
        console.log(chalk.gray('    4) Google Gemini'))
        console.log(chalk.gray('    5) xAI Grok'))
        const pChoice = (await ask(chalk.white(`  ${T('providerChoose')}`))).trim() || '1'
        llmProvider = { '1': 'anthropic', '2': 'openai', '3': 'deepseek', '4': 'gemini', '5': 'grok' }[pChoice] || 'anthropic'
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
      `# WALLET_PRIVATE_KEY=  ${T('envWallet')}`,
      '',
      T('envLlm'),
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
    console.log(chalk.green(`  ${T('configSaved')}`))
    console.log()
    console.log(chalk.cyan(`  ${T('startMiningCmd')}`), chalk.white('npx @openshell-cc/miner-cli start'))
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
      console.log(chalk.yellow(`  ${T('noConfig')}`))
      console.log()
      console.log(chalk.white(`  ${T('runSetup')}`))
      console.log(chalk.cyan('    npx @openshell-cc/miner-cli setup'))
      console.log()
      console.log(chalk.gray(`  ${T('orManualEnv')}`))
      console.log(chalk.gray(`    SHELL_API_KEY=sk-shell-xxx  ${T('getKeyAt')}`))
      console.log(chalk.gray('    # LLM_API_KEY=sk-ant-...'))
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
      ? chalk.magenta(T('modeAdvLabel')) + chalk.gray(` (${config.llmProvider}/${config.llmModel}, ×1.0 ${T('ptsUnit')})`)
      : chalk.cyan(T('modeFreeLabel')) + chalk.gray(` (×0.2 ${T('ptsUnit')})`)
    const pollLabel = getPollIntervalLabel(config.miningMode)
    console.log(chalk.gray(`  Oracle:  ${config.oracleUrl}`))
    console.log(chalk.gray(`  Auth:    ${authMethod}`))
    console.log(`  ${chalk.gray('Mode:')}   ${miningModeLabel}`)
    console.log(chalk.gray(`  Poll:    ${pollLabel}`))
    if (config.miningMode === 'free') {
      console.log(chalk.gray('  ') + chalk.green('✓') + chalk.gray(` ${T('freeRunning')}`))
      console.log(chalk.gray('  ') + chalk.yellow('→') + chalk.gray(` ${T('freeUpgrade')}`))
    } else {
      console.log(chalk.gray('  ') + chalk.green('✓') + chalk.gray(` ${T('advRunning')}`))
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
    console.log(chalk.green(`  ${T('miningStarted')}`), chalk.gray(T('pressCtrlC')))
    if (config.miningMode === 'free') {
      console.log()
      console.log(chalk.yellow(`  ${T('boostTip')}`))
      console.log(chalk.gray(`     ${T('boostDesc')}`))
      console.log(chalk.gray(`     ${T('boostBenefit')}`))
    }

    // ── Honeypot guide ──
    console.log()
    console.log(chalk.cyan(`  ${T('honeypotTitle')}`))
    console.log(chalk.gray(`     ${T('honeypotDesc')}`))
    console.log(chalk.gray(`     ${T('honeypotAction')}`))
    console.log(chalk.gray(`     ${T('honeypotKeywords')}`))
    console.log(chalk.gray(`     ${T('honeypotReward')}`))
    if (config.miningMode !== 'free') {
      console.log(chalk.yellow(`     ${T('honeypotLlmTip')}`))
    } else {
      console.log(chalk.gray(`     ${T('honeypotFreeAuto')}`))
    }
    console.log()

    // Mining loop
    let totalTasks = 0
    let totalSuccess = 0
    let totalPoints = 0
    let consecutiveFails = 0
    let upgradeHintShown = false

    while (true) {
      const pollSpinner = ora('Polling for tasks...').start()
      let lastTask: TaskData | null = null

      try {
        const { task, tip, latestVersion } = await pollForTask(config, token, getSupportedTaskModes(config), config.miningMode)

        // Soft upgrade hint — show once per session
        if (latestVersion && latestVersion !== CLIENT_VERSION && !upgradeHintShown) {
          upgradeHintShown = true
          console.log()
          console.log(chalk.yellow(`  ⬆ ${T('upgradeAvailable')} v${latestVersion}`))
          console.log(chalk.cyan('    npx @openshell-cc/miner-cli@latest start'))
          console.log()
        }

        if (!task) {
          pollSpinner.info('No tasks available. Waiting...')
          await sleep(getRandomPollInterval(config.miningMode))
          continue
        }

        lastTask = task

        const modeTag = chalk.magenta('[LOCAL]')

        pollSpinner.succeed(`${modeTag} Task: ${chalk.yellow(task.taskType)} | Chain: ${chalk.blue(task.targetChain)} | Difficulty: ${'★'.repeat(task.difficulty)} | Reward: ${chalk.cyan(task.rewardPoints)} pts`)

        if (tip) {
          console.log(chalk.dim('  ╔══════════════════════════════════════════════════════════╗'))
          console.log(chalk.cyan('  💡 ') + chalk.dim(tip))
          console.log(chalk.dim('  ╚══════════════════════════════════════════════════════════╝'))
          console.log()
        }

        // All tasks use local compute (miner's own LLM)
        const result = await handleLocalCompute(config, token, task)

        totalTasks++

        if (result.result === 'success') {
          totalSuccess++
          consecutiveFails = 0
          totalPoints += result.pointsAwarded ?? 0
          console.log(chalk.green(`  ${T('attackSuccess')} +${result.pointsAwarded} pts`))
          if (config.miningMode === 'free') {
            console.log(chalk.yellow(`  ${T('freePtsHint')}`))
          }
        }
        else if (result.result === 'penalty') {
          consecutiveFails++
          const level = result.warningLevel ?? 0
          if (result.penaltyRate === 0) {
            console.log(chalk.yellow(`  ⚠ ${T('honeypotWarn')} (${level}/3): ${result.message}`))
            console.log(chalk.gray(`     ${T('honeypotWarnDesc')}`))
            console.log(chalk.gray(`     ${T('honeypotWarnFix')}`))
            if (config.miningMode !== 'free') {
              console.log(chalk.yellow(`     ${T('honeypotLlmFix')}`))
            }
          } else {
            console.log(chalk.red(`  ✗ ${T('honeypotPenalty')} (-${Math.round((result.penaltyRate ?? 0) * 100)}%): -${result.penaltyAmount} pts | ${result.remainingPoints} pts`))
            console.log(chalk.red(`     ${T('honeypotPenDesc')}`))
          }
        }
        else if (result.result === 'slashed') {
          consecutiveFails++
          console.log(chalk.red(`  ✗ SLASHED! ${result.message}`))
        }
        else if (result.result === 'failed') {
          consecutiveFails++
          console.log(chalk.red(`  ✗ ${T('failedLabel')}: ${result.message}`))
          if (config.miningMode === 'free') {
            console.log(chalk.yellow(`  ${T('freeFailHint')}`))
          }
        }
        else {
          const spotTag = result.spotCheckSelected ? chalk.yellow(' [spot-check pending]') : ''
          console.log(chalk.gray(`  ~ ${T('submittedVerify')}${spotTag}`))
        }

        const rate = totalTasks > 0 ? (totalSuccess / totalTasks * 100).toFixed(1) : '0.0'
        const miningTag = config.miningMode === 'self_llm' ? '⚡' : '🆓'
        console.log(chalk.gray(`  [${miningTag} Stats] Tasks: ${totalTasks} | Success: ${totalSuccess} (${rate}%) | Total pts: ${totalPoints}`))
        console.log()
      }
      catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown'

        // Version outdated — must upgrade
        if (errMsg.startsWith('VERSION_OUTDATED')) {
          const parts = errMsg.split(':')
          const minVersion = parts[1] || 'latest'
          const upgradeCmd = parts[2] || 'npx @openshell-cc/miner-cli@latest setup'
          pollSpinner.fail(chalk.red(`${T('versionOutdated')} v${minVersion}+`))
          console.log(chalk.yellow(`  ${T('pleaseUpgrade')}`))
          console.log(chalk.cyan(`    ${upgradeCmd}`))
          console.log()
          process.exit(1)
        }

        // IP login limit — too many accounts from this IP today
        if (errMsg === 'IP_LOGIN_LIMIT') {
          pollSpinner.fail(chalk.yellow(T('ipLoginLimit')))
          console.log(chalk.gray(`  ${T('ipLoginDesc')}`))
          console.log(chalk.gray(`  ${T('ipLoginRetry')}`))
          console.log()
          console.log(chalk.gray(`  ${T('retryIn')} 30 min...`))
          await sleep(30 * 60_000)
          continue
        }

        // Mining access restricted (banned)
        if (errMsg === 'MINING_ACCESS_RESTRICTED') {
          pollSpinner.fail(chalk.yellow(T('miningRestricted')))
          console.log(chalk.cyan(`  ${T('accountLoggedIn')}`))
          console.log(chalk.cyan(`  ${T('miningNotEnabled')}`))
          console.log(chalk.cyan(`  ${T('checkDashboard')}`))
          console.log(chalk.cyan('  → Dashboard: https://openshell.cc'))
          console.log()
          console.log(chalk.gray(`  ${T('retryIn')} 60s...`))
          await sleep(60_000)
          continue
        }

        // Free mode: IP already in use by another miner
        if (errMsg.startsWith('FREE_MODE_IP_LIMIT')) {
          const hint = errMsg.split(':').slice(1).join(':').trim()
          pollSpinner.fail(chalk.yellow(T('freeIpLimit')))
          if (hint) console.log(chalk.gray(`  ℹ ${hint}`))
          console.log(chalk.cyan(`  ${T('freeIpSolution')}`))
          console.log(chalk.cyan(`  ${T('freeIpBenefit')}`))
          console.log(chalk.gray(`  ${T('keyLocalSafe')}`))
          console.log()
          console.log(chalk.gray(`  ${T('retryIn')} 5 min...`))
          await sleep(5 * 60_000)
          continue
        }

        // Free mode: nodes congested (too many free miners online)
        if (errMsg.startsWith('FREE_MODE_CONGESTED')) {
          pollSpinner.fail(chalk.yellow(T('freeCongested')))
          console.log(chalk.cyan(`  ${T('freeCongestedDesc')}`))
          console.log(chalk.cyan(`  ${T('freeCongestSln')}`))
          console.log(chalk.cyan(`  ${T('freeCongestAdv')}`))
          console.log(chalk.gray(`  ${T('freeCongestProv')}`))
          console.log(chalk.gray(`  ${T('keyLocalSafe')}`))
          console.log()
          console.log(chalk.gray(`  ${T('retryIn')} 3 min...`))
          await sleep(3 * 60_000)
          continue
        }

        // Free mode: daily limit reached
        if (errMsg === 'FREE_MODE_DAILY_LIMIT') {
          pollSpinner.info(chalk.yellow(T('freeDailyLimit')))
          console.log(chalk.cyan(`  ${T('freeDailyTomorrow')}`))
          console.log(chalk.cyan(`  ${T('freeDailyUpgrade')}`))
          console.log()
          console.log(chalk.gray(`  ${T('retryIn')} 30 min...`))
          await sleep(30 * 60_000)
          continue
        }

        pollSpinner.fail(`Error: ${errMsg}`)

        if (err instanceof Error && (errMsg.includes('Token expired') || errMsg.includes('re-authenticate') || errMsg.includes('Invalid or expired'))) {
          if (config.walletPrivateKey) {
            console.log(chalk.yellow(`  ${T('reAuthenticating')}`))
            try {
              const result = await autoAuthenticate(config, opts.referral)
              token = result.token
              console.log(chalk.green(`  ${T('reAuthSuccess')}`))
            }
            catch (authErr) {
              console.error(chalk.red(`  Re-auth failed: ${authErr instanceof Error ? authErr.message : 'Unknown'}`))
            }
          } else {
            // API key users can't re-auth — key is likely revoked
            console.log(chalk.red(`  ${T('apiKeyInvalid')}`))
            console.log(chalk.red(`  ${T('apiKeyExit')}`))
            process.exit(1)
          }
        }
      }

      // Verify tasks: quick re-poll (30s) to boost P2P verification throughput
      // Attack tasks + errors: normal random interval
      if (lastTask?.isVerifyTask) {
        await sleep(30_000)
      } else {
        const nextInterval = getRandomPollInterval(config.miningMode)
        await sleep(nextInterval)
      }
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
            'X-Client-Version': CLIENT_VERSION,
          },
        }),
        fetch(`${config.oracleUrl}/tasks/my-submissions?limit=${recentCount}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Device-Fingerprint': getDeviceFingerprint(),
            'X-Client-Version': CLIENT_VERSION,
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
            statusText = chalk.yellow(T('verifying'))
          } else if (valid && settleStatus === 'settled') {
            statusIcon = chalk.green('✓')
            statusText = chalk.green(`${T('success')} +${pts} pts`)
          } else if (valid && settleStatus === 'pending') {
            statusIcon = chalk.cyan('⏳')
            statusText = chalk.cyan(`${T('settling')} (${pts} pts ${T('ptsAwait')})`)
          } else if (valid) {
            statusIcon = chalk.green('✓')
            statusText = chalk.green(`+${pts} pts`)
          } else {
            statusIcon = chalk.red('✗')
            statusText = chalk.red(T('canaryMiss'))
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
  const TASK_WINDOW_MS = 30 * 60 * 1000 // 30 min retry window
  const deadline = Date.now() + TASK_WINDOW_MS
  const canaryActions = task.targetAgentProfile.canaryActions ?? []
  const managed = isPlatformManaged(config)
  let attempt = 0

  /** Check if actions triggered any canary */
  const checkCanary = (actions: string[]) =>
    canaryActions.length > 0
      ? canaryActions.some(ca => actions.includes(ca))
      : actions.length > 0

  /** Execute payload and return result + canary status */
  const tryExecute = async (p: string, label: string) => {
    const spinner = ora(`${label} Executing locally...`).start()
    const result = await executeLocally(config, task.targetAgentProfile, p, task.mockToolDefinitions)
    const tokens = result.tokensUsed.input + result.tokensUsed.output
    const actions = result.actionLog.map(a => a.name)
    const hit = checkCanary(actions)
    spinner.succeed(`${label} ${result.actionLog.length} actions, ${result.rounds} rounds, ${tokens} tokens`)
    return { result, actions, hit }
  }

  /** Submit successful result to Oracle */
  const submitResult = async (payload: string, execResult: Awaited<ReturnType<typeof executeLocally>>) => {
    if (!task.challengeNonce) throw new Error('Task missing challengeNonce')
    const subSpinner = ora('Submitting result...').start()
    const body = buildSubmissionBody(task.id, payload, task.challengeNonce, execResult, config)
    const res = await submitLocalComputeResult(config, token, body)
    subSpinner.stop()
    return res
  }

  while (Date.now() < deadline) {
    attempt++
    const remaining = Math.ceil((deadline - Date.now()) / 60_000)

    // 1. Generate payload
    const genSpinner = ora(`[#${attempt}] Generating payload... (${remaining}min left)`).start()
    let payload: string
    try {
      payload = await generatePayloadLocally(config, task)
      genSpinner.succeed(`[#${attempt}] Payload generated (${payload.length} chars)`)
    } catch (err) {
      genSpinner.fail(`[#${attempt}] Generation failed: ${err instanceof Error ? err.message : err}`)
      if (Date.now() >= deadline) break
      if (managed) { console.log(chalk.gray('  Auto-retrying in 10s...')); await sleep(10_000); continue }
      const action = await askRetryAction(remaining)
      if (action === 'quit') {
        const waitMs = deadline - Date.now()
        if (waitMs > 0) { console.log(chalk.gray(`  Waiting ${Math.ceil(waitMs / 60_000)}min for task to expire...`)); await sleep(waitMs) }
        break
      }
      continue
    }

    // 2. Execute
    let execResult: Awaited<ReturnType<typeof executeLocally>>
    let triggered: string[]
    let hit: boolean
    try {
      const exec = await tryExecute(payload, `[#${attempt}]`)
      execResult = exec.result; triggered = exec.actions; hit = exec.hit
    } catch (err) {
      console.log(chalk.red(`  [#${attempt}] Execution failed: ${err instanceof Error ? err.message : err}`))
      if (Date.now() >= deadline) break
      if (managed) { console.log(chalk.gray('  Auto-retrying in 10s...')); await sleep(10_000); continue }
      const action = await askRetryAction(remaining)
      if (action === 'quit') {
        const waitMs = deadline - Date.now()
        if (waitMs > 0) { console.log(chalk.gray(`  Waiting ${Math.ceil(waitMs / 60_000)}min for task to expire...`)); await sleep(waitMs) }
        break
      }
      continue
    }

    // 3. Canary hit → submit
    if (hit) {
      console.log(chalk.green(`  [#${attempt}] Canary triggered: ${triggered.join(', ')}`))
      return await submitResult(payload, execResult)
    }

    // 4. No canary — retry loop
    console.log(chalk.yellow(`  [#${attempt}] No canary hit (actions: ${triggered.join(', ') || 'none'})`))
    if (Date.now() >= deadline) break

    if (managed) {
      console.log(chalk.gray(`  Auto-retrying in 10s... (${remaining}min left)`))
      await sleep(10_000)
      continue
    }

    // Interactive: ask user
    const action = await askRetryAction(remaining)
    if (action === 'quit') {
      // Wait for task to expire before moving on
      const waitMs = deadline - Date.now()
      if (waitMs > 0) {
        console.log(chalk.gray(`  Waiting ${Math.ceil(waitMs / 60_000)}min for task to expire...`))
        await sleep(waitMs)
      }
      break
    }
    if (action === 'edit') {
      // Edit → re-execute loop (user can keep editing until satisfied or quit)
      let editedPayload = payload
      while (Date.now() < deadline) {
        editedPayload = await editPayload(editedPayload)
        try {
          const reExec = await tryExecute(editedPayload, `[#${attempt}E]`)
          if (reExec.hit) {
            console.log(chalk.green(`  Canary triggered: ${reExec.actions.join(', ')}`))
            return await submitResult(editedPayload, reExec.result)
          }
          console.log(chalk.yellow(`  No canary hit (actions: ${reExec.actions.join(', ') || 'none'})`))
        } catch (err) {
          console.log(chalk.red(`  Execution failed: ${err instanceof Error ? err.message : err}`))
        }
        const rem2 = Math.ceil((deadline - Date.now()) / 60_000)
        const again = await askRetryAction(rem2)
        if (again === 'quit') {
          const waitMs2 = deadline - Date.now()
          if (waitMs2 > 0) {
            console.log(chalk.gray(`  Waiting ${Math.ceil(waitMs2 / 60_000)}min for task to expire...`))
            await sleep(waitMs2)
          }
          return { result: 'failed', message: 'Task expired (user quit)' }
        }
        if (again === 'retry') break // back to auto-generate
        // 'edit' continues the edit loop
      }
    }
    // 'retry' — loops back to generate new payload
  }

  return { result: 'failed', message: `No canary triggered after ${attempt} attempts (30min window expired)` }
}

/** Ask user what to do after failed attack (interactive mode only) */
function askRetryAction(minutesLeft: number): Promise<'retry' | 'edit' | 'quit'> {
  // Non-TTY (nohup/background): auto-retry without waiting for input
  if (!process.stdin.isTTY) {
    console.log(chalk.gray(`  [auto-retry] ${minutesLeft}min left, generating new payload...`))
    return Promise.resolve('retry')
  }
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    console.log(chalk.cyan(`\n  What next? (${minutesLeft}min left)`))
    console.log(chalk.gray('    [R] Retry with new LLM-generated payload (default)'))
    console.log(chalk.gray('    [E] Edit payload manually before execution'))
    console.log(chalk.gray('    [Q] Quit — wait for task to expire'))
    rl.question(chalk.cyan('  Choice [R/e/q]: '), answer => {
      rl.close()
      const a = answer.trim().toLowerCase()
      if (a === 'e') resolve('edit')
      else if (a === 'q') resolve('quit')
      else resolve('retry')
    })
  })
}

/** Let user manually edit payload text */
function editPayload(original: string): Promise<string> {
  if (!process.stdin.isTTY) return Promise.resolve(original)
  return new Promise(resolve => {
    console.log(chalk.cyan('\n  Current payload:'))
    console.log(chalk.gray('  ─'.repeat(30)))
    console.log(chalk.white(`  ${original}`))
    console.log(chalk.gray('  ─'.repeat(30)))
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(chalk.cyan('  Enter new payload (or press Enter to keep): '), answer => {
      rl.close()
      resolve(answer.trim() || original)
    })
  })
}


function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
