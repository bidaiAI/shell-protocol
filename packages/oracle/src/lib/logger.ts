/**
 * Structured JSON logger
 * Replaces console.log with structured output for production observability.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel
const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[LOG_LEVEL]
}

function formatLog(level: LogLevel, context: Record<string, unknown>, msg: string) {
  const entry: Record<string, unknown> = {
    level,
    msg,
    time: new Date().toISOString(),
    service: 'shell-oracle',
    ...context,
  }

  // Serialize errors properly
  if (entry.err instanceof Error) {
    entry.err = { message: entry.err.message, stack: entry.err.stack }
  }

  return JSON.stringify(entry)
}

function log(level: LogLevel, contextOrMsg: Record<string, unknown> | string, msg?: string) {
  if (!shouldLog(level)) return

  if (typeof contextOrMsg === 'string') {
    console.log(formatLog(level, {}, contextOrMsg))
  }
  else {
    console.log(formatLog(level, contextOrMsg, msg ?? ''))
  }
}

export const logger = {
  debug: (ctx: Record<string, unknown> | string, msg?: string) => log('debug', ctx, msg),
  info: (ctx: Record<string, unknown> | string, msg?: string) => log('info', ctx, msg),
  warn: (ctx: Record<string, unknown> | string, msg?: string) => log('warn', ctx, msg),
  error: (ctx: Record<string, unknown> | string, msg?: string) => log('error', ctx, msg),
}
