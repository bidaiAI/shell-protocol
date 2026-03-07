#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig, validateConfig } from './config.js'
import { authenticate } from './auth.js'
import { pollForTask, submitPayload, submitLocalComputeResult, type TaskData, type SubmitResult } from './poller.js'
import { generatePayload } from './llm/provider.js'
import { executeLocally } from './local-sandbox/executor.js'
import { buildSubmissionBody } from './local-sandbox/proof.js'
import * as tier1 from './llm/prompts/tier1-token-injection.js'
import * as tier2 from './llm/prompts/tier2-social-engineering.js'
import * as tier3 from './llm/prompts/tier3-memory-poisoning.js'

const program = new Command()

program
  .name('shell-miner')
  .description('$SHELL Protocol Miner CLI — Mine $SHELL by red-teaming AI agents')
  .version('0.2.0')

program
  .command('start')
  .description('Start mining (authenticate, poll tasks, generate payloads, submit)')
  .option('-r, --referral <code>', 'Referral code from another miner')
  .action(async (opts) => {
    const config = loadConfig()
    const errors = validateConfig(config)
    if (errors.length > 0) {
      console.error(chalk.red('Configuration errors:'))
      errors.forEach(e => console.error(chalk.red(`  - ${e}`)))
      process.exit(1)
    }

    console.log(chalk.cyan(`
    ███████╗██╗  ██╗███████╗██╗     ██╗
    ██╔════╝██║  ██║██╔════╝██║     ██║
    ███████╗███████║█████╗  ██║     ██║
    ╚════██║██╔══██║██╔══╝  ██║     ██║
    ███████║██║  ██║███████╗███████╗███████╗
    ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝
    `))
    console.log(chalk.cyan('  Decentralized AI Red Team Network'))
    console.log(chalk.gray(`  Oracle: ${config.oracleUrl}`))
    console.log(chalk.gray(`  LLM: ${config.llmProvider} (${config.llmModel})`))
    console.log(chalk.gray(`  Mode: ${config.executionMode}`))
    console.log()

    // Authenticate
    const authSpinner = ora('Authenticating with Oracle...').start()
    let token: string
    let user: { id: string, walletAddress: string, tier: string, shellPoints: number, referralCode: string }

    try {
      const result = await authenticate(config, opts.referral)
      token = result.token
      user = result.user
      authSpinner.succeed(`Authenticated as ${chalk.green(user.walletAddress.slice(0, 8))}... | Tier: ${chalk.yellow(user.tier)} | Points: ${chalk.cyan(user.shellPoints)}`)
      console.log(chalk.gray(`  Your referral code: ${user.referralCode}`))
    }
    catch (err) {
      authSpinner.fail(`Authentication failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      process.exit(1)
    }

    console.log()
    console.log(chalk.green('Mining started. Press Ctrl+C to stop.'))
    console.log()

    // Mining loop
    let totalTasks = 0
    let totalSuccess = 0
    let totalPoints = 0

    while (true) {
      const pollSpinner = ora('Polling for tasks...').start()

      try {
        const task = await pollForTask(config, token)

        if (!task) {
          pollSpinner.info('No tasks available. Waiting...')
          await sleep(config.pollingIntervalMs)
          continue
        }

        const isLocalCompute = task.executionMode === 'local_compute'
        const modeTag = isLocalCompute ? chalk.magenta('[LOCAL]') : chalk.blue('[SANDBOX]')

        pollSpinner.succeed(`${modeTag} Task received: ${chalk.yellow(task.taskType)} | Chain: ${chalk.blue(task.targetChain)} | Difficulty: ${'*'.repeat(task.difficulty)} | Reward: ${chalk.cyan(task.rewardPoints)} pts`)

        // ── Execution mode routing ──
        // local_only: only handle local_compute tasks; skip sandbox_verified tasks
        // sandbox_only: only handle sandbox_verified tasks; skip local_compute tasks
        // auto (default): handle whatever the server sends
        if (config.executionMode === 'local_only' && !isLocalCompute) {
          console.log(chalk.gray('  [local_only] Skipping sandbox task — waiting for local_compute task.'))
          await sleep(config.pollingIntervalMs)
          continue
        }

        if (config.executionMode === 'sandbox_only' && isLocalCompute) {
          console.log(chalk.gray('  [sandbox_only] Skipping local_compute task — waiting for sandbox task.'))
          await sleep(config.pollingIntervalMs)
          continue
        }

        let result: SubmitResult

        if (isLocalCompute) {
          // ── Local Compute Path ──
          result = await handleLocalCompute(config, token, task)
        } else {
          // ── Sandbox Verified Path (original flow) ──
          result = await handleSandboxVerified(config, token, task)
        }

        totalTasks++

        if (result.result === 'success') {
          totalSuccess++
          totalPoints += result.pointsAwarded ?? 0
          console.log(chalk.green(`  Attack successful! +${result.pointsAwarded} points`))
        }
        else if (result.result === 'slashed') {
          console.log(chalk.red(`  SLASHED! ${result.message}`))
        }
        else if (result.result === 'failed') {
          console.log(chalk.red(`  Failed: ${result.message}`))
        }
        else {
          const spotTag = result.spotCheckSelected ? chalk.yellow(' [spot-check]') : ''
          console.log(chalk.gray(`  Submitted for verification.${spotTag} ${result.message}`))
        }

        // Stats
        const rate = totalTasks > 0 ? (totalSuccess / totalTasks * 100).toFixed(1) : '0.0'
        console.log(chalk.gray(`  [Stats] Tasks: ${totalTasks} | Success: ${totalSuccess} (${rate}%) | Points: ${totalPoints}`))
        console.log()
      }
      catch (err) {
        pollSpinner.fail(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)

        if (err instanceof Error && (err.message.includes('Token expired') || err.message.includes('re-authenticate'))) {
          console.log(chalk.yellow('Re-authenticating...'))
          try {
            const result = await authenticate(config, opts.referral)
            token = result.token
            console.log(chalk.green('Re-authenticated successfully'))
          }
          catch (authErr) {
            console.error(chalk.red(`Re-auth failed: ${authErr instanceof Error ? authErr.message : 'Unknown'}`))
            console.log(chalk.yellow('Will retry on next cycle...'))
          }
        }
      }

      await sleep(config.pollingIntervalMs)
    }
  })

/** Handle local_compute task: payload → local execution → hash/proof → structured submit */
async function handleLocalCompute(
  config: ReturnType<typeof loadConfig>,
  token: string,
  task: TaskData,
): Promise<SubmitResult> {
  // 1. Generate attack payload
  const genSpinner = ora('Generating attack payload...').start()
  const { systemPrompt, userPrompt } = buildPrompts(task)
  const payloadResponse = await generatePayload(config, systemPrompt, userPrompt)
  const payload = payloadResponse.text
  genSpinner.succeed(`Payload generated (${payloadResponse.tokensUsed.input + payloadResponse.tokensUsed.output} tokens)`)

  // 2. Execute locally against mock agent
  const execSpinner = ora('Executing locally against target agent...').start()
  const executionResult = await executeLocally(
    config,
    task.targetAgentProfile,
    payload,
    task.mockToolDefinitions,
  )
  const totalTokens = executionResult.tokensUsed.input + executionResult.tokensUsed.output
  execSpinner.succeed(
    `Local execution done: ${executionResult.actionLog.length} actions, ${executionResult.rounds} rounds, ${totalTokens} tokens, ${executionResult.executionTimeMs}ms`,
  )

  // 3. Build structured submission body with proof
  const subSpinner = ora('Submitting structured result...').start()
  const body = buildSubmissionBody(
    task.id,
    payload,
    task.challengeNonce!,
    executionResult,
    config,
  )

  const result = await submitLocalComputeResult(config, token, body)
  subSpinner.stop()
  return result
}

/** Handle sandbox_verified task: payload → submit for server-side sandbox verification */
async function handleSandboxVerified(
  config: ReturnType<typeof loadConfig>,
  token: string,
  task: TaskData,
): Promise<SubmitResult> {
  const genSpinner = ora('Generating attack payload with LLM...').start()
  const { systemPrompt, userPrompt } = buildPrompts(task)
  const response = await generatePayload(config, systemPrompt, userPrompt)
  genSpinner.succeed(`Payload generated (${response.tokensUsed.input + response.tokensUsed.output} tokens used)`)

  const subSpinner = ora('Submitting payload to Oracle...').start()
  const result = await submitPayload(config, token, task.id, response.text)
  subSpinner.stop()
  return result
}

program
  .command('status')
  .description('Check your mining stats')
  .action(async () => {
    const config = loadConfig()
    const { token } = await authenticate(config)

    const res = await fetch(`${config.oracleUrl}/leaderboard/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    console.log(chalk.cyan('\n$SHELL Mining Status:'))
    console.log(JSON.stringify(data, null, 2))
  })

// Prevent silent crashes
process.on('unhandledRejection', (err) => {
  console.error(chalk.red('Unhandled error:'), err)
})

program.parse()

// ── Helpers ──

function buildPrompts(task: TaskData): { systemPrompt: string, userPrompt: string } {
  const profile = task.targetAgentProfile
  const taskInfo = {
    targetAgentType: profile.name,
    targetChain: task.targetChain,
    defenseLevel: profile.defenseLevel,
    objective: `Trigger unauthorized action on ${profile.name}`,
    injectionSurface: task.injectionSurface,
  }

  switch (task.taskType) {
    case 'token_injection':
      return {
        systemPrompt: tier1.SYSTEM_PROMPT,
        userPrompt: tier1.buildUserPrompt(taskInfo),
      }
    case 'social_engineering':
      return {
        systemPrompt: tier2.SYSTEM_PROMPT,
        userPrompt: tier2.buildUserPrompt(taskInfo),
      }
    case 'memory_poisoning':
      return {
        systemPrompt: tier3.SYSTEM_PROMPT,
        userPrompt: tier3.buildUserPrompt(taskInfo),
      }
    case 'full_chain':
    default:
      return {
        systemPrompt: tier1.SYSTEM_PROMPT,
        userPrompt: tier1.buildUserPrompt({
          ...taskInfo,
          objective: `Full chain exploit: reconnaissance → injection → exploitation on ${profile.name}`,
        }),
      }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
