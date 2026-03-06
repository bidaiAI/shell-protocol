#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig, validateConfig } from './config.js'
import { authenticate } from './auth.js'
import { pollForTask, submitPayload, type TaskData } from './poller.js'
import { generatePayload } from './llm/provider.js'
import * as tier1 from './llm/prompts/tier1-token-injection.js'
import * as tier2 from './llm/prompts/tier2-social-engineering.js'
import * as tier3 from './llm/prompts/tier3-memory-poisoning.js'

const program = new Command()

program
  .name('shell-miner')
  .description('$SHELL Protocol Miner CLI — Mine $SHELL by red-teaming AI agents')
  .version('0.1.0')

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

        pollSpinner.succeed(`Task received: ${chalk.yellow(task.taskType)} | Chain: ${chalk.blue(task.targetChain)} | Difficulty: ${'*'.repeat(task.difficulty)} | Reward: ${chalk.cyan(task.rewardPoints)} pts`)

        // Generate payload
        const genSpinner = ora('Generating attack payload with LLM...').start()
        const { systemPrompt, userPrompt } = buildPrompts(task)
        const response = await generatePayload(config, systemPrompt, userPrompt)
        genSpinner.succeed(`Payload generated (${response.tokensUsed.input + response.tokensUsed.output} tokens used)`)

        // Submit
        const subSpinner = ora('Submitting payload to Oracle...').start()
        const result = await submitPayload(config, token, task.id, response.text)

        totalTasks++

        if (result.result === 'success') {
          totalSuccess++
          totalPoints += result.pointsAwarded ?? 0
          subSpinner.succeed(chalk.green(`Attack successful! +${result.pointsAwarded} points`))
        }
        else if (result.result === 'slashed') {
          subSpinner.fail(chalk.red(`SLASHED! ${result.message}`))
        }
        else {
          subSpinner.info(`Submitted for verification. ${result.message}`)
        }

        // Stats
        const rate = totalTasks > 0 ? (totalSuccess / totalTasks * 100).toFixed(1) : '0.0'
        console.log(chalk.gray(`  [Stats] Tasks: ${totalTasks} | Success: ${totalSuccess} (${rate}%) | Points: ${totalPoints}`))
        console.log()
      }
      catch (err) {
        pollSpinner.fail(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)

        if (err instanceof Error && err.message.includes('Token expired')) {
          console.log(chalk.yellow('Re-authenticating...'))
          const result = await authenticate(config, opts.referral)
          token = result.token
        }
      }

      await sleep(config.pollingIntervalMs)
    }
  })

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

program.parse()

// ── Helpers ──

function buildPrompts(task: TaskData) {
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
      // Full chain uses tier1 as base with enhanced prompt
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
