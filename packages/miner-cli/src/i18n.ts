/** Auto-detect system language: zh for Chinese, en for everything else */
function detectLanguage(): 'zh' | 'en' {
  const env = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || ''
  if (env.startsWith('zh')) return 'zh'
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    if (locale.startsWith('zh')) return 'zh'
  } catch { /* ignore */ }
  return 'en'
}

export const lang = detectLanguage()

const messages = {
  // ── Setup Wizard ──
  setupTitle:        { zh: 'Miner 配置向导', en: 'Miner Setup Wizard' },
  setupDesc:         { zh: '本向导将创建 .env 配置文件。', en: 'This wizard will create a .env file with your configuration.' },
  step1Title:        { zh: 'Step 1: 获取你的 $SHELL 密钥', en: 'Step 1: Get your $SHELL API key' },
  step1Auto:         { zh: '1) 自动注册（推荐，一键完成）', en: '1) Auto-register (recommended, one click)' },
  step1Manual:       { zh: '2) 已有密钥（手动粘贴 sk-shell-xxx）', en: '2) Already have a key (paste sk-shell-xxx)' },
  step1Choose:       { zh: '选择 [1]: ', en: 'Choose [1]: ' },
  step1ManualGuide:  { zh: '前往 https://openshell.cc → 注册 → 控制面板 → Agent 注册', en: 'Go to https://openshell.cc → Register → Dashboard → Agent Registration' },
  registering:       { zh: '正在向 Oracle 注册...', en: 'Registering with Oracle...' },
  saveKeyWarn:       { zh: '⚠ 请保存此 API Key！不会再显示。', en: '⚠ Save this API key! It will NOT be shown again.' },
  regFailed:         { zh: '注册失败', en: 'Registration failed' },
  manualKeyFallback: { zh: '你可以手动粘贴已有密钥：', en: 'You can manually paste an existing key instead:' },

  step2Title:        { zh: 'Step 2: 邀请码（可选）', en: 'Step 2: Invite code (optional)' },
  step2Desc:         { zh: '有邀请码？输入后可增加每日免费额度', en: 'Have an invite code? Enter it to increase your daily free limit' },
  step2Skip:         { zh: '没有邀请码？直接回车跳过，注册即可免费挖矿', en: 'No invite code? Press Enter to skip — free mining starts immediately' },
  step2Prompt:       { zh: '邀请码（留空跳过）: ', en: 'Invite code (leave blank to skip): ' },
  redeemingInvite:   { zh: '正在兑换邀请码...', en: 'Redeeming invite code...' },
  inviteSuccess:     { zh: '每日免费额度已提升！+5 次/天', en: 'Daily free limit increased! +5 submissions/day' },
  inviteFailed:      { zh: '邀请码兑换失败', en: 'Invite code failed' },
  inviteRetryHint:   { zh: '稍后可重试，或分享你的推荐码赚取积分。', en: 'You can try again later, or share your own referral code to earn points.' },
  inviteSkipped:     { zh: '已跳过。无需邀请码即可开始免费挖矿！', en: 'Skipped. Free mining works without an invite code!' },

  step3Title:        { zh: 'Step 3: 挖矿模式', en: 'Step 3: Mining mode' },
  step3Free:         { zh: '🆓 免费模式 — 直接回车，零 API Key，积分 ×0.2，每日有限次数', en: '🆓 Free mode — press Enter, no API key needed, ×0.2 points, daily limit' },
  step3Adv:          { zh: '⚡ 高效模式 — 填写 LLM API Key，积分 ×1.0，无次数限制', en: '⚡ Advanced mode — provide LLM API key, ×1.0 points, unlimited' },
  step3Security:     { zh: '🔒 安全保证：API Key 仅在本地运行，不上传平台，完全安全', en: '🔒 Security: API key runs locally only, never uploaded to the platform' },
  step3Prompt:       { zh: 'LLM_API_KEY（留空 = 免费模式）: ', en: 'LLM_API_KEY (leave blank = free mode): ' },
  providerTitle:     { zh: 'LLM 提供商:', en: 'LLM Provider:' },
  providerChoose:    { zh: '选择 [1]: ', en: 'Choose [1]: ' },
  configSaved:       { zh: '✓ 配置已保存到 .env', en: '✓ Configuration saved to .env' },
  startMiningCmd:    { zh: '开始挖矿:', en: 'Start mining:' },

  // ── Start: first-run ──
  noConfig:          { zh: '未找到配置文件！', en: 'No configuration found!' },
  runSetup:          { zh: '运行配置向导（2 分钟完成）：', en: 'Run the setup wizard (takes 2 minutes):' },
  orManualEnv:       { zh: '或手动创建 .env 文件：', en: 'Or create a .env file manually:' },
  getKeyAt:          { zh: '← 在 https://openshell.cc/dashboard 获取', en: '← get from https://openshell.cc/dashboard' },

  // ── Start: mining header ──
  modeAdvLabel:      { zh: '⚡ 高效模式', en: '⚡ Advanced' },
  modeFreeLabel:     { zh: '🆓 免费模式', en: '🆓 Free mode' },
  ptsUnit:           { zh: '积分', en: 'pts' },
  freeRunning:       { zh: '✓ 零 API Key 免费挖矿，平台 AI 生成 payload', en: '✓ Zero-cost mining, platform AI generates payload' },
  freeUpgrade:       { zh: '→ 升级到高效模式：设置 LLM_API_KEY 环境变量（Key 仅本地使用，不上传平台）', en: '→ Upgrade to advanced mode: set LLM_API_KEY (key stays local, never uploaded)' },
  advRunning:        { zh: '✓ 高效模式已启用，API Key 仅在本地运行，不上传平台，完全安全', en: '✓ Advanced mode active. API key runs locally only, never uploaded' },

  miningStarted:     { zh: '挖矿已启动。', en: 'Mining started.' },
  pressCtrlC:        { zh: '按 Ctrl+C 停止。', en: 'Press Ctrl+C to stop.' },
  boostTip:          { zh: '💡 提升成功率: 配置 LLM_API_KEY 解锁高级攻击模式', en: '💡 Boost success rate: set LLM_API_KEY to unlock advanced attack mode' },
  boostDesc:         { zh: '在 .env 中设置 LLM_API_KEY (支持 Anthropic/OpenAI/DeepSeek/Gemini/xAI 等)', en: 'Set LLM_API_KEY in .env (supports Anthropic/OpenAI/DeepSeek/Gemini/xAI etc.)' },
  boostBenefit:      { zh: '自带 LLM → 更强模型 → 更高攻破率 → 5x 积分倍率', en: 'Your own LLM → stronger model → higher breach rate → up to 5x multiplier' },

  // ── Honeypot guide ──
  honeypotTitle:     { zh: '📋 蜜罐检测指南:', en: '📋 Honeypot Detection Guide:' },
  honeypotDesc:      { zh: '约 5% 的任务是蜜罐 — 系统提示本身含恶意指令（如盗取钱包、泄露密钥）', en: '~5% of tasks are honeypots — system prompts contain malicious instructions (wallet drain, key leak, etc.)' },
  honeypotAction:    { zh: '遇到蜜罐任务时，不要生成攻击 payload，而要输出安全漏洞报告', en: 'When detecting a honeypot, output a security vulnerability report instead of an attack payload' },
  honeypotKeywords:  { zh: '报告中需包含: vulnerable/malicious/backdoor/drain/steal 等关键词', en: 'Report must include keywords: vulnerable/malicious/backdoor/drain/steal' },
  honeypotReward:    { zh: '正确识别蜜罐 = 奖励积分 | 对蜜罐发起攻击 = 扣分惩罚', en: 'Correctly identify honeypot = reward | Attack a honeypot = penalty' },
  honeypotLlmTip:    { zh: '💡 自带 LLM 模式: 请确保你的 prompt 中包含蜜罐检测逻辑', en: '💡 LLM mode: ensure your prompt includes honeypot detection logic' },
  honeypotFreeAuto:  { zh: '✓ 免费模式已内置蜜罐自动检测，无需额外配置', en: '✓ Free mode has built-in honeypot auto-detection, no extra config needed' },

  // ── Mining loop results ──
  attackSuccess:     { zh: '✓ 攻击成功！', en: '✓ Attack successful!' },
  freePtsHint:       { zh: '💡 配置 LLM_API_KEY 可获得 5x 积分倍率！本地运行，密钥安全不上传', en: '💡 Set LLM_API_KEY for 5x point multiplier! Runs locally, key never uploaded' },
  honeypotWarn:      { zh: '蜜罐警告', en: 'Honeypot warning' },
  honeypotWarnDesc:  { zh: '该任务的 Agent 系统提示含明显恶意行为（盗取钱包/泄露密钥等）', en: 'This task\'s agent system prompt contains malicious behavior (wallet drain, key leak, etc.)' },
  honeypotWarnFix:   { zh: '正确做法: 识别恶意指令后输出安全漏洞报告，而非攻击 payload', en: 'Correct action: output a security vulnerability report, not an attack payload' },
  honeypotLlmFix:    { zh: '💡 建议在 LLM prompt 中加入蜜罐检测: 检查目标 agent 是否含 drain/steal/exfiltrate 等恶意行为', en: '💡 Add honeypot detection to your LLM prompt: check if target agent contains drain/steal/exfiltrate behavior' },
  honeypotPenalty:   { zh: '蜜罐惩罚', en: 'Honeypot penalty' },
  honeypotPenDesc:   { zh: '多次未检测到蜜罐。请检查你的 payload 生成逻辑是否包含蜜罐识别。', en: 'Multiple honeypot misses. Check if your payload generation includes honeypot detection.' },
  failedLabel:       { zh: '失败', en: 'Failed' },
  freeFailHint:      { zh: '💡 配置 LLM_API_KEY 使用更强模型，大幅提升攻破成功率！密钥仅本地使用，安全不上传', en: '💡 Set LLM_API_KEY for a stronger model and much higher breach rate! Key stays local, never uploaded' },
  submittedVerify:   { zh: '已提交验证。', en: 'Submitted for verification.' },

  // ── Error handlers ──
  versionOutdated:   { zh: '客户端版本过低！服务端要求', en: 'Client outdated! Server requires' },
  pleaseUpgrade:     { zh: '请升级你的矿机:', en: 'Please upgrade your miner:' },
  ipLoginLimit:      { zh: '该 IP 今日账号数达上限', en: 'Too many accounts from this IP today' },
  ipLoginDesc:       { zh: '每个 IP 每天最多 5 个活跃账号。', en: 'Each IP can only have 5 active accounts per day.' },
  ipLoginRetry:      { zh: '明天再试或使用其他网络。', en: 'Try again tomorrow or use a different network.' },
  retryIn:           { zh: '后重试...', en: 'Retrying in' },
  miningRestricted:  { zh: '挖矿权限尚未开启', en: 'Mining access not yet enabled for your account' },
  accountLoggedIn:   { zh: '✓ 账号已登录', en: '✓ Your account is logged in successfully' },
  miningNotEnabled:  { zh: '✗ 挖矿权限尚未开启', en: '✗ Mining access has not been enabled yet' },
  checkDashboard:    { zh: '→ 前往控制面板查看状态或联系管理员', en: '→ Visit your Dashboard to check status, or contact the admin' },
  freeIpLimit:       { zh: '免费模式 IP 限制: 该 IP 已有其他免费矿工', en: 'Free mode IP limit: another free miner is already using this IP' },
  freeIpSolution:    { zh: '→ 解决方案: 在 .env 中配置 LLM_API_KEY 升级到⚡高效模式', en: '→ Solution: set LLM_API_KEY in .env to upgrade to ⚡ Advanced mode' },
  freeIpBenefit:     { zh: '→ 高效模式无 IP 限制，更强模型，5x 积分！', en: '→ Advanced mode: no IP limit, stronger model, 5x points!' },
  keyLocalSafe:      { zh: '→ 密钥仅在你本地运行，绝不上传到平台', en: '→ Key runs locally only, never uploaded to the platform' },
  freeCongested:     { zh: '免费节点目前拥堵', en: 'Free nodes currently congested' },
  freeCongestedDesc: { zh: '⏳ 当前免费矿工过多，节点资源紧张', en: '⏳ Too many free miners online, node resources are tight' },
  freeCongestSln:    { zh: '→ 解决方案: 在 .env 中配置 LLM_API_KEY 升级到⚡高效模式', en: '→ Solution: set LLM_API_KEY in .env to upgrade to ⚡ Advanced mode' },
  freeCongestAdv:    { zh: '→ 高效模式无排队限制，更强模型，5x 积分！', en: '→ Advanced mode: no queue limit, stronger model, 5x points!' },
  freeCongestProv:   { zh: '→ 支持 Anthropic/OpenAI/DeepSeek/Gemini/xAI 等', en: '→ Supports Anthropic/OpenAI/DeepSeek/Gemini/xAI and more' },
  freeDailyLimit:    { zh: '免费模式每日限额已用完', en: 'Free mode daily limit reached' },
  freeDailyTomorrow: { zh: '→ 今日免费次数已用完，明天再来！', en: '→ Today\'s free submissions used up, come back tomorrow!' },
  freeDailyUpgrade:  { zh: '→ 或升级⚡高效模式: 设置 LLM_API_KEY 解锁无限挖矿', en: '→ Or upgrade to ⚡ Advanced: set LLM_API_KEY for unlimited mining' },
  reAuthenticating:  { zh: '正在重新认证...', en: 'Re-authenticating...' },
  reAuthSuccess:     { zh: '重新认证成功', en: 'Re-authenticated successfully' },
  apiKeyInvalid:     { zh: 'API Key 可能无效或已撤销。请检查配置。', en: 'API key may be invalid or revoked. Please check your configuration.' },
  apiKeyExit:        { zh: '退出中。请重新运行 `shell-miner setup` 或更新 .env 中的 SHELL_API_KEY', en: 'Exiting. Re-run `shell-miner setup` or update SHELL_API_KEY in .env' },

  // ── Status command ──
  verifying:         { zh: '验证中', en: 'Verifying' },
  success:           { zh: '成功', en: 'Success' },
  settling:          { zh: '结算中', en: 'Settling' },
  ptsAwait:          { zh: '待发', en: 'awaiting' },
  canaryMiss:        { zh: '未触发 canary', en: 'Canary not triggered' },
  pendingCheck:      { zh: '验证仍在进行中 — 稍后可用 `shell-miner status` 查看', en: 'Verification still pending — check back with `shell-miner status`' },

  // ── .env comments ──
  envWallet:         { zh: '# 可选：Solana 钱包', en: '# Optional: Solana wallet' },
  envLlm:            { zh: '# LLM (高效模式) — API Key 仅本地使用，不上传平台', en: '# LLM (Advanced mode) — API key runs locally, never uploaded' },
} as const

type MessageKey = keyof typeof messages
export function T(key: MessageKey): string {
  return messages[key][lang]
}
