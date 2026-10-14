import type { Register } from 'claude-code'

// Adapted from the ask guard in this repo's former cache-tax fork (karanb192/cache-tax 2.2.1, MIT):
// the dialog and the state it needs to price a cold send, without keepwarm.
const TTL_MS = 60 * 60 * 1000
const BIG_TOKENS = 50000

// $ per million tokens, [cache read, 1h cache write], list prices September 2026.
// Longer family names first: a model id matches the first row it contains.
const PRICES: Array<[string, number, number]> = [
  ['fable-5-1', 0.25, 20],
  ['fable-5', 1, 20],
  ['opus-5', 0.5, 10],
  ['opus-4', 0.5, 10],
  ['sonnet-5', 0.2, 4],
  ['sonnet', 0.3, 6],
  ['haiku', 0.1, 2],
]

export type State = {
  lastRequestAt: number
  lastModel: string | null
  ctx: number
  compacted: boolean
  ackedAt: number
}

export function freshState(): State {
  return { lastRequestAt: 0, lastModel: null, ctx: 0, compacted: false, ackedAt: 0 }
}

function priceOf(model: string | null): [number, number] | null {
  const m = (model ?? '').toLowerCase().replace(/[\s.]+/g, '-')
  for (const [family, read, write] of PRICES) if (m.includes(family)) return [read, write]
  return null
}

export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h`
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m`
}

function fmtUsd(usd: number | null): string {
  return usd == null ? 'n/a' : '$' + (usd >= 100 ? usd.toFixed(0) : usd.toFixed(2))
}

function isCold(s: State, now: number): boolean {
  return s.lastRequestAt > 0 && !s.compacted && now - s.lastRequestAt >= TTL_MS
}

export function guardText(s: State, now: number): string {
  const price = priceOf(s.lastModel)
  const rate = price ? `$${price[1]}/MTok` : 'the cache-write rate'
  const cold = price ? fmtUsd(s.ctx * price[1] / 1e6) : 'n/a'
  const warm = price ? ` (a warm turn would have cost ${fmtUsd(s.ctx * price[0] / 1e6)})` : ''
  return `the prompt cache went cold ${fmtDuration(now - s.lastRequestAt - TTL_MS)} ago. Sending this re-writes ` +
    `up to ${s.ctx.toLocaleString('en-US')} tokens at ${rate} = ${cold}${warm}.`
}

export type ResumeFields = {
  source: string
  model?: string
  context_tokens?: number
  seconds_since_last_response?: number
}

/** A resumed or forked session starts with the transcript's clock, so its first send can be cold. */
export function seedFromResume(s: State, e: ResumeFields, now: number) {
  if (e.source !== 'resume' && e.source !== 'fork') return
  if (typeof e.context_tokens === 'number' && e.context_tokens > 0) s.ctx = e.context_tokens
  if (typeof e.seconds_since_last_response === 'number') s.lastRequestAt = now - e.seconds_since_last_response * 1000
  if (typeof e.model === 'string') s.lastModel = e.model
  s.compacted = false
}

export const register: Register = on => {
  let s = freshState()

  on('session.start', async ($, e, next) => {
    const r = await next(e)
    s.ctx = (await $.session.usage()).context.tokens ?? 0
    // cache-tax in refuse or ask mode guards the same send; two dialogs for one prompt.
    if ((await $.command.list()).some(c => c.name === 'cache-tax')) {
      $.ui.log('cache-tax is also installed, so a cold send can be guarded twice. Run /cache-tax guard warn, or uninstall cache-tax.')
    }
    return r
  })

  on('classic.SessionStart', async ($, e, next) => {
    const r = await next(e)
    // /clear starts a new conversation in the same process; nothing priced before it still exists.
    if (e.source === 'clear') s = freshState()
    else seedFromResume(s, e, await $.clock.now())
    // The resume payload may omit the model; without it the dialog cannot price the cold write.
    if (!s.lastModel) s.lastModel = await $.session.model()
    return r
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'plugin') return next(e)
    if (typeof e.text !== 'string' || e.text.trimStart().startsWith('/')) return next(e)
    const now = await $.clock.now()
    if (!isCold(s, now) || s.ctx < BIG_TOKENS) return next(e)
    // The resend after a dismissed dialog goes through.
    if (s.ackedAt === s.lastRequestAt) {
      s.ackedAt = 0
      return next(e)
    }
    s.ackedAt = s.lastRequestAt
    const text = e.text
    const refill = () => $.prompt.fill({ text }).catch(() => undefined)
    let pick = ''
    try {
      pick = await $.ui.ask(`${guardText(s, now)} Send it anyway?`, { header: 'Cache cold', options: ['Proceed', 'Start new session'] })
    } catch {
      // Dismissed, or no one to ask (-p): refuse once, with the prompt back in the box.
      void refill()
      return { drop: `cache-guard: ${guardText(s, now)} Your prompt is back in the box; send it again to pay it.` }
    }
    if (pick === 'Proceed') {
      s.ackedAt = 0
      return next(e)
    }
    if (pick === 'Start new session') {
      // command.run can't be called from this hook (it would wait on the turn the hook holds), so it runs once the hook returns.
      $.clock.after(0, () => { void $.command.run({ command: 'clear', args: '' }).then(refill, refill) })
      return { drop: 'cache-guard: starting fresh with /clear; your prompt is back in the box.' }
    }
    void refill()
    return { drop: 'cache-guard: not sent; your prompt is back in the box.' }
  })

  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) s.lastRequestAt = await $.clock.now()
    yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId) return r
    const now = await $.clock.now()
    // turn.step stamps the exact request time; when no step of this turn did, the turn's end is the floor.
    if (now - s.lastRequestAt > e.durationMs) s.lastRequestAt = now
    s.compacted = false
    s.ackedAt = 0
    const u = e.usage
    if (u) {
      if (u.model) s.lastModel = u.model
      // A turn's usage sums its responses; the engine's live figure is the real window, the sum only a fallback.
      const live = (await $.session.usage()).context.tokens
      s.ctx = live && live > 0 ? live : u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
    }
    return r
  })

  on('session.compact', async ($, e, next) => {
    const r = await next(e)
    if (!e.agentId) {
      s.compacted = true
      s.ctx = 0
      s.ackedAt = 0
    }
    return r
  })
}
