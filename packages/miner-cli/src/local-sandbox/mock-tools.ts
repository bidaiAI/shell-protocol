/**
 * Mock Wallet & Tool Handlers for Local Execution
 *
 * Simulates blockchain wallet operations — records intent without real transactions.
 */

export interface ToolCall {
  name: string
  arguments: Record<string, unknown>
  timestamp: number
}

export interface MockWalletState {
  chain: string
  address: string
  balances: Record<string, number>
  actionLog: ToolCall[]
}

export function createMockWallet(chain: string): MockWalletState {
  const wallets: Record<string, MockWalletState> = {
    solana: {
      chain: 'solana',
      address: 'SimWa11et1111111111111111111111111111111111',
      balances: { SOL: 5.0, USDC: 100.0 },
      actionLog: [],
    },
    ethereum: {
      chain: 'ethereum',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD0E',
      balances: { ETH: 1.5, USDC: 500.0, USDT: 200.0 },
      actionLog: [],
    },
    bsc: {
      chain: 'bsc',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD0E',
      balances: { BNB: 3.0, USDC: 300.0, BUSD: 150.0 },
      actionLog: [],
    },
    base: {
      chain: 'base',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD0E',
      balances: { ETH: 0.5, USDC: 200.0 },
      actionLog: [],
    },
    arbitrum: {
      chain: 'arbitrum',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD0E',
      balances: { ETH: 0.8, USDC: 400.0, ARB: 1000.0 },
      actionLog: [],
    },
  }

  return wallets[chain] ?? wallets.solana
}

/**
 * Build mock tool handlers that record all calls but never execute real transactions.
 */
export function buildMockToolHandlers(wallet: MockWalletState) {
  const record = (name: string, args: Record<string, unknown>) => {
    wallet.actionLog.push({ name, arguments: args, timestamp: Date.now() })
  }

  return {
    // ── Trading operations ──
    buy_token: (args: Record<string, unknown>) => {
      record('buy_token', args)
      const amount = Number(args.amount) || 100
      return { success: true, txHash: `0x${Date.now().toString(16)}a1b2`, filledAmount: amount, avgPrice: 0.00134, fee: amount * 0.003, status: 'confirmed', blockNumber: 19847523 }
    },

    sell_token: (args: Record<string, unknown>) => {
      record('sell_token', args)
      const amount = Number(args.amount) || 50
      return { success: true, txHash: `0x${Date.now().toString(16)}c3d4`, filledAmount: amount, avgPrice: 0.00128, proceeds: amount * 0.00128, fee: amount * 0.003, status: 'confirmed' }
    },

    swap_token: (args: Record<string, unknown>) => {
      record('swap_token', args)
      return { success: true, txHash: `0x${Date.now().toString(16)}e5f6`, inputAmount: args.amount, outputAmount: Number(args.amount || 1) * 1.02, slippage: '0.3%', route: `${args.from_token} → ${args.to_token}` }
    },

    swap_uniswap: (args: Record<string, unknown>) => {
      record('swap_uniswap', args)
      return { success: true, txHash: `0x${Date.now().toString(16)}7890`, pool: 'UniswapV3', liquidityUsed: '85%', priceImpact: '0.12%' }
    },

    // ── Transfer operations ──
    transfer: (args: Record<string, unknown>) => {
      record('transfer', args)
      return { success: true, txHash: '0xSIMULATED_TRANSFER_TX' }
    },

    wallet_transfer: (args: Record<string, unknown>) => {
      record('wallet_transfer', args)
      return { success: true, txHash: '0xSIMULATED_WALLET_TRANSFER_TX' }
    },

    // ── Approval operations ──
    approve_token: (args: Record<string, unknown>) => {
      record('approve_token', args)
      return { success: true, txHash: '0xSIMULATED_APPROVE_TX' }
    },

    // ── DeFi operations ──
    supply_aave: (args: Record<string, unknown>) => {
      record('supply_aave', args)
      return { success: true, txHash: '0xSIMULATED_SUPPLY_TX' }
    },

    withdraw_aave: (args: Record<string, unknown>) => {
      record('withdraw_aave', args)
      return { success: true, txHash: '0xSIMULATED_WITHDRAW_TX' }
    },

    bridge_token: (args: Record<string, unknown>) => {
      record('bridge_token', args)
      return { success: true, txHash: '0xSIMULATED_BRIDGE_TX' }
    },

    // ── Token creation ──
    create_token: (args: Record<string, unknown>) => {
      record('create_token', args)
      return { success: true, tokenAddress: '0xSIMULATED_TOKEN', note: 'Simulated creation' }
    },

    // ── System operations ──
    install_skill: (args: Record<string, unknown>) => {
      record('install_skill', args)
      return { success: true, note: 'Simulated skill installation' }
    },

    execute_command: (args: Record<string, unknown>) => {
      record('execute_command', args)
      return { output: 'Simulated command output', exitCode: 0 }
    },

    send_message: (args: Record<string, unknown>) => {
      record('send_message', args)
      return { success: true, messageId: 'sim_msg_001' }
    },

    post_tweet: (args: Record<string, unknown>) => {
      record('post_tweet', args)
      return { success: true, tweetId: 'sim_tweet_001' }
    },

    // ── Read-only operations ──
    check_balance: (_args: Record<string, unknown>) => {
      record('check_balance', _args)
      return { balances: wallet.balances, pendingTransactions: 2, lastUpdated: new Date().toISOString(), chain: wallet.chain }
    },

    check_portfolio: (_args: Record<string, unknown>) => {
      record('check_portfolio', _args)
      const totalUSD = Object.values(wallet.balances).reduce((sum, v) => sum + v * 100, 0)
      return { portfolio: wallet.balances, totalValueUSD: Math.round(totalUSD), pnl24h: '+3.2%', topGainer: 'USDC', alerts: ['Token XYZ has unusual volume spike'] }
    },

    get_price: (args: Record<string, unknown>) => {
      record('get_price', args)
      return { token: args.token ?? args.symbol, price: 0.001234, change24h: '+5.2%', volume24h: 482000, high24h: 0.001456, low24h: 0.001012, marketCap: 1240000 }
    },

    get_trending: (_args: Record<string, unknown>) => {
      record('get_trending', _args)
      return {
        tokens: [
          { name: 'MoonCat', symbol: 'MCAT', price: 0.042, change24h: '+180%', volume: 890000 },
          { name: 'SafeYield', symbol: 'SFY', price: 1.23, change24h: '+45%', volume: 340000 },
          { name: 'DeFiPulse', symbol: 'DFP', price: 0.089, change24h: '+22%', volume: 120000 },
        ],
      }
    },

    get_new_launches: (_args: Record<string, unknown>) => {
      record('get_new_launches', _args)
      return {
        launches: [
          { name: 'NeuraiSwap', symbol: 'NSWP', launchedAt: new Date(Date.now() - 3600000).toISOString(), initialPrice: 0.001, currentPrice: 0.0035, holders: 89 },
          { name: 'ChainGuard', symbol: 'CGRD', launchedAt: new Date(Date.now() - 7200000).toISOString(), initialPrice: 0.01, currentPrice: 0.008, holders: 34 },
        ],
      }
    },

    check_token_safety: (args: Record<string, unknown>) => {
      record('check_token_safety', args)
      return { safe: true, score: 72, flags: ['unverified_contract', 'low_liquidity'], liquidity: 45000, holderCount: 156, topHolderPct: '34%' }
    },

    analyze_contract: (args: Record<string, unknown>) => {
      record('analyze_contract', args)
      return { safe: true, riskScore: 3, issues: [{ severity: 'low', description: 'No renounced ownership' }], verified: true, proxy: false }
    },

    set_alert: (args: Record<string, unknown>) => {
      record('set_alert', args)
      return { success: true, alertId: 'alert_001' }
    },

    read_email: (_args: Record<string, unknown>) => {
      record('read_email', _args)
      return { emails: [{ from: 'user@example.com', subject: 'Test', body: 'Hello' }] }
    },

    read_timeline: (_args: Record<string, unknown>) => {
      record('read_timeline', _args)
      return { posts: [{ user: '@crypto_fan', text: 'Just bought some tokens!' }] }
    },

    browse_url: (args: Record<string, unknown>) => {
      record('browse_url', args)
      return { title: 'Simulated Page', content: 'Page content loaded successfully. Contains standard DeFi protocol documentation.' }
    },

    // ── DevOps / GitHub operations ──
    approve_pr: (args: Record<string, unknown>) => {
      record('approve_pr', args)
      return { success: true, prNumber: args.pr_number ?? 247, status: 'approved' }
    },

    merge_pr: (args: Record<string, unknown>) => {
      record('merge_pr', args)
      return { success: true, mergeCommit: '0xabc123', branch: 'main' }
    },

    deploy_prod: (args: Record<string, unknown>) => {
      record('deploy_prod', args)
      return { success: true, deployId: 'deploy_sim_001', environment: 'production' }
    },

    read_secret: (args: Record<string, unknown>) => {
      record('read_secret', args)
      return { value: 'sim_secret_value_redacted', key: args.key }
    },

    // ── Financial operations ──
    approve_payout: (args: Record<string, unknown>) => {
      record('approve_payout', args)
      return { success: true, payoutId: 'payout_sim_001', amount: args.amount }
    },

    refund_payment: (args: Record<string, unknown>) => {
      record('refund_payment', args)
      return { success: true, refundId: 'refund_sim_001' }
    },

    schedule_payment: (args: Record<string, unknown>) => {
      record('schedule_payment', args)
      return { success: true, scheduledAt: new Date(Date.now() + 86400000).toISOString() }
    },

    // ── Customer support ──
    issue_refund: (args: Record<string, unknown>) => {
      record('issue_refund', args)
      return { success: true, refundId: 'ref_sim_001', status: 'processed' }
    },

    change_account_settings: (args: Record<string, unknown>) => {
      record('change_account_settings', args)
      return { success: true, settingsUpdated: Object.keys(args) }
    },

    escalate_ticket: (args: Record<string, unknown>) => {
      record('escalate_ticket', args)
      return { success: true, escalatedTo: 'senior-support', ticketId: args.ticket_id }
    },

    // ── DAO / Governance ──
    vote_proposal: (args: Record<string, unknown>) => {
      record('vote_proposal', args)
      return { success: true, proposalId: args.proposal_id, vote: args.vote }
    },

    create_proposal: (args: Record<string, unknown>) => {
      record('create_proposal', args)
      return { success: true, proposalId: 'prop_sim_001' }
    },

    // ── Messaging / Slack ──
    send_slack: (args: Record<string, unknown>) => {
      record('send_slack', args)
      return { success: true, channel: args.channel, ts: '1710000000.000100' }
    },

    // ── Wallet signature operations ──
    approve_dapp: (args: Record<string, unknown>) => {
      record('approve_dapp', args)
      return { success: true, dappUrl: args.url, permissions: ['read', 'write'] }
    },

    sign_tx: (args: Record<string, unknown>) => {
      record('sign_tx', args)
      return { success: true, signature: '0xSIMULATED_SIGNATURE', txHash: '0xSIM_TX' }
    },

    // ── OpenClaw-style system tools ──
    exec: (args: Record<string, unknown>) => {
      record('exec', args)
      return { stdout: 'simulated output', stderr: '', exitCode: 0 }
    },

    bash: (args: Record<string, unknown>) => {
      record('bash', args)
      return { stdout: 'simulated shell output', stderr: '', exitCode: 0 }
    },

    read_file: (args: Record<string, unknown>) => {
      record('read_file', args)
      return { content: 'simulated file content', path: args.path }
    },

    write_file: (args: Record<string, unknown>) => {
      record('write_file', args)
      return { success: true, path: args.path, bytesWritten: 256 }
    },

    web_fetch: (args: Record<string, unknown>) => {
      record('web_fetch', args)
      return { status: 200, body: '{"result": "simulated fetch response"}', url: args.url }
    },

    web_search: (args: Record<string, unknown>) => {
      record('web_search', args)
      return { results: [{ title: 'Search Result', url: 'https://example.com', snippet: 'Simulated search result' }] }
    },
  }
}
