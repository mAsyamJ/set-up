import 'dotenv/config'
import { Telegraf } from 'telegraf'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN')
  process.exit(1)
}

const WORKSPACE = process.env.AEGIS_WORKSPACE || '/home/asyam/dev/Project/aegis-hackathon-kit'
const KIRO_PROVIDER = process.env.KIRO_PROVIDER || `${WORKSPACE}/scripts/providers/kiro-provider.sh`

const bot = new Telegraf(token)

function cleanKiroOutput(stdout) {
  return stdout
    // Strip ANSI terminal color/control codes
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    // Remove Kiro trust warning
    .replace(/All tools are now trusted[\s\S]*?using-tools-trust-all-safely\n\n/m, '')
    // Remove Kiro credits footer
    .replace(/▸ Credits:[\s\S]*$/m, '')
    // Remove Kiro quote marker
    .replace(/^>\s?/gm, '')
    .trim()
}

async function callKiro(prompt) {
  const { stdout, stderr } = await execFileAsync(KIRO_PROVIDER, [prompt], {
    cwd: WORKSPACE,
    timeout: 240000,
    maxBuffer: 1024 * 1024 * 12,
    env: {
      ...process.env,
      AEGIS_WORKSPACE: WORKSPACE
    }
  })

  if (stderr && stderr.toLowerCase().includes('error')) {
    console.error(stderr)
  }

  return cleanKiroOutput(stdout)
}

bot.start((ctx) => {
  ctx.reply('Aegis Hermes is now routed through Kiro.')
})

bot.on('text', async (ctx) => {
  const text = ctx.message.text

  await ctx.reply('Routing to Kiro...')

  try {
    const prompt = `
You are Hermes routed through AWS Kiro for the Aegis Protocol hackathon workspace.

Rules:
- Be practical and technical.
- Prefer commands, file paths, and next actions.
- For Aegis Protocol, prioritize Security RPC, preflight API, policy engine, adapter layer, and RiskOps dashboard.
- Do not ask for secrets.
- Do not expose private keys or tokens.

Telegram user message:
${text}
`

    const reply = await callKiro(prompt)
    await ctx.reply((reply || 'Kiro returned no output.').slice(0, 3900))
  } catch (err) {
    await ctx.reply(`Kiro provider error: ${err.message}`)
  }
})

bot.launch()
console.log('telegram-kiro-gateway running')

function stopBot(signal) {
  try {
    bot.stop(signal)
  } catch (err) {
    if (!String(err?.message || err).includes('Bot is not running')) {
      console.error(err)
    }
  }
}

process.once('SIGINT', () => stopBot('SIGINT'))
process.once('SIGTERM', () => stopBot('SIGTERM'))
