// Copied from plugins/context-band/hooks/split.ts so the desk draws the same bar and legend.
// ponytail: two copies; change both together, or move it to a shared plugin if a third mod needs it.

import type { ApiMessage, SessionContextBreakdown } from 'claude-code'

import type { Slice, Snapshot } from '../types'

// Anthropic palette (brand-guidelines skill): blue = system, green = setup you control,
// orange = the conversation. Tints and shades are by eye; tune them in the app.
const ENGINE_ROWS: Record<string, { label: string; color: string }> = {
  'System prompt': { label: 'system prompt', color: '#6a9bcc' },
  'System tools': { label: 'tools', color: '#9dbfe0' },
  'MCP tools': { label: 'mcp tools', color: '#4a7aa8' },
  'Custom agents': { label: 'agents', color: '#788c5d' },
  'Memory files': { label: 'memory files', color: '#a3b48a' },
  Skills: { label: 'skills', color: '#5a6b45' },
}
const MESSAGES_ROW = 'Messages'
const UNKNOWN_ROW = '#b0aea5'

export const BUCKETS = {
  prompts: { label: 'your prompts', color: '#d97757' },
  injected: { label: 'injected', color: '#e8a58c' },
  replies: { label: 'replies', color: '#b85c3f' },
  thinking: { label: 'thinking', color: '#f0c4b0' },
  toolCalls: { label: 'tool calls', color: '#c98a6e' },
  toolResults: { label: 'tool results', color: '#9c4a30' },
  images: { label: 'images', color: '#e8e6dc' },
} as const
export type Bucket = keyof typeof BUCKETS

export const FREE = '#b0aea5'
export const TICK = '#e8a58c'
// ponytail: base64 length says nothing about image tokens; ~1.6k tokens each is the usual
const IMAGE_CHARS = 6400
// Reminders the engine already counts in its own rows. Only the first copy is skipped:
// a re-sent copy is context spent again, and that belongs in injected.
// ponytail: matched on the engine's wording; if it changes, the block falls back to injected
const ENGINE_COUNTED: [kind: string, marker: string][] = [
  ['memory', 'Codebase and user instructions are shown below'],
  ['skills', 'skills are available for use with the Skill tool'],
  ['agents', 'Available agent types for the Agent tool'],
]

// What each slice holds, for the hover detail under the legend.
export const ABOUT: Record<string, string> = {
  'system prompt': "Claude Code's own instructions and your output style.",
  tools: 'Schemas of the built-in tools (Bash, Read, Edit, and the rest).',
  'mcp tools': 'Tool schemas from connected MCP servers.',
  agents: 'Descriptions of the subagent types the Agent tool can start.',
  'memory files': 'CLAUDE.md files, rules, and auto-memory loaded at session start.',
  skills: "The skill listing: each skill's name and description.",
  'your prompts': 'What you typed.',
  injected: 'Text added to your turns: hook output, reminders, and re-sent listings.',
  replies: "Claude's visible replies.",
  thinking: "Claude's reasoning blocks.",
  'tool calls': 'The input of every tool call Claude made.',
  'tool results': 'What the tools returned.',
  images: 'Images and PDFs, estimated at about 1.6k tokens each.',
  'mcp server instructions': 'Usage notes MCP servers send with their tools, read on every turn.',
  free: 'Room left in the window. Claude Code compacts at the tick on the bar.',
}

/** The biggest few of a name-to-tokens map, as `a 12k, b 3k, c 900`. */
export function top(entries: Iterable<[string, number]>, n = 3): string | undefined {
  const sums = new Map<string, number>()
  for (const [k, v] of entries) sums.set(k, (sums.get(k) ?? 0) + v)
  const best = [...sums].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, n)
  return best.length ? best.map(([k, v]) => `${k} ${fmt(v)}`).join(', ') : undefined
}

// ponytail: matched on the engine's wording for hook output ("SessionStart:startup hook success",
// "UserPromptSubmit hook additional context"); it names the hook event, never the plugin or script
const HOOK_EVENT = /\b([A-Z][A-Za-z]+)(?::[a-z_]+)? hook (?:success|additional context|blocking error)/
/** Who put an injected block there: a hook event, or the engine itself. */
export const injectedSource = (t: string) => HOOK_EVENT.exec(t)?.[1] ?? 'engine'

const textOf = (v: unknown): string =>
  typeof v === 'string' ? v
  : Array.isArray(v) ? v.map(b => (b && typeof b === 'object' && 'text' in b ? String(b.text) : '')).join('')
  : ''

/** Character counts per bucket, plus tool-result characters per tool name. */
export function measure(messages: readonly ApiMessage[]) {
  const chars: Record<Bucket, number> = { prompts: 0, injected: 0, replies: 0, thinking: 0, toolCalls: 0, toolResults: 0, images: 0 }
  const toolName = new Map<string, string>()
  const byTool = new Map<string, number>()
  const bySource = new Map<string, number>()
  const seen = new Set<string>()
  for (const m of messages) {
    for (const b of m.content) {
      if (b.type === 'text') {
        const t = String(b.text ?? '')
        const bucket: Bucket = m.role === 'assistant' ? 'replies' : t.includes('<system-reminder>') ? 'injected' : 'prompts'
        const kind = bucket === 'injected' ? ENGINE_COUNTED.find(([, marker]) => t.includes(marker))?.[0] : undefined
        if (kind && !seen.has(kind)) {
          seen.add(kind)
          continue
        }
        chars[bucket] += t.length
        if (bucket === 'injected') bySource.set(injectedSource(t), (bySource.get(injectedSource(t)) ?? 0) + t.length)
      } else if (b.type === 'thinking') {
        chars.thinking += String(b.thinking ?? '').length
      } else if (b.type === 'tool_use') {
        toolName.set(String(b.id), String(b.name))
        chars.toolCalls += String(b.name).length + JSON.stringify(b.input ?? {}).length
      } else if (b.type === 'tool_result') {
        const n = textOf(b.content).length
        chars.toolResults += n
        const name = toolName.get(String(b.tool_use_id)) ?? 'other'
        byTool.set(name, (byTool.get(name) ?? 0) + n)
      } else if (b.type === 'image' || b.type === 'document') {
        chars.images += IMAGE_CHARS
      }
    }
  }
  return { chars, byTool, bySource }
}

/** Scale character counts to the engine's Messages tokens, so the split always sums to it. */
export function splitMessages(messages: readonly ApiMessage[], messagesTokens: number) {
  const { chars, byTool, bySource } = measure(messages)
  const keys = Object.keys(chars) as Bucket[]
  const total = keys.reduce((s, k) => s + chars[k], 0)
  const tokens = {} as Record<Bucket, number>
  for (const k of keys) tokens[k] = total ? Math.round((messagesTokens * chars[k]) / total) : 0
  if (total) {
    // rounding drift goes to the largest bucket
    const biggest = keys.reduce((a, b) => (chars[b] > chars[a] ? b : a))
    tokens[biggest] += messagesTokens - keys.reduce((s, k) => s + tokens[k], 0)
  }
  const topTool = [...byTool].sort((a, b) => b[1] - a[1])[0]?.[0]
  const scale = (m: Map<string, number>): [string, number][] => [...m].map(([k, v]) => [k, total ? Math.round((messagesTokens * v) / total) : 0])
  return { tokens, topTool, byTool: scale(byTool), bySource: scale(bySource) }
}

export const pct = (tokens: number, window: number) => (tokens > 0 && window > 0 ? Math.max(1, Math.round((tokens / window) * 100)) : 0)

export function fmt(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`
  return String(n)
}

const detail = (label: string, biggest?: string) => {
  const d = [ABOUT[label] ?? 'A row /context reports; run /context for its detail.', biggest && `Biggest: ${biggest}.`].filter(Boolean).join(' ')
  return d ? { detail: d } : {}
}

export function toSnapshot(b: SessionContextBreakdown, messages: readonly ApiMessage[]): Snapshot {
  const window = b.rawMaxTokens
  const slices: Slice[] = []
  const add = (label: string, tokens: number, color: string, note?: string, biggest?: string) =>
    slices.push({ label, tokens, percent: pct(tokens, window), color, ...(note ? { note } : {}), ...detail(label, biggest) })
  const bigByRow: Record<string, string | undefined> = {
    'mcp tools': top((b.mcpTools ?? []).filter(t => t.isLoaded).map(t => [t.serverName, t.tokens])),
    agents: top((b.agents ?? []).map(a => [a.agentType, a.tokens])),
    'memory files': top((b.memoryFiles ?? []).map(f => [f.path.split('/').slice(-2).join('/'), f.tokens])),
    skills: top((b.skills?.skillFrontmatter ?? []).map(k => [k.pluginName ?? k.source, k.tokens])),
  }
  let free = 0
  for (const row of b.categories) {
    if (row.kind === 'free') free += row.tokens
    if (row.kind !== 'used' || row.tokens <= 0) continue // buffer sits past the tick; deferred is outside the window
    if (row.name === MESSAGES_ROW) {
      const { tokens, topTool, byTool, bySource } = splitMessages(messages, row.tokens)
      for (const k of Object.keys(BUCKETS) as Bucket[]) {
        const biggest = k === 'toolResults' ? top(byTool) : k === 'injected' ? top(bySource) : undefined
        if (tokens[k] > 0) add(BUCKETS[k].label, tokens[k], BUCKETS[k].color, k === 'toolResults' ? topTool : undefined, biggest)
      }
    } else {
      const known = ENGINE_ROWS[row.name]
      const label = known?.label ?? row.name.toLowerCase()
      add(label, row.tokens, known?.color ?? UNKNOWN_ROW, undefined, bigByRow[label])
    }
  }
  slices.push({ label: 'free', tokens: free, percent: pct(free, window), color: FREE, ...detail('free') })
  return {
    slices,
    used: b.totalTokens,
    window,
    ...(b.autoCompactThreshold ? { threshold: b.autoCompactThreshold } : {}),
    percent: Math.round(b.percentage),
  }
}

export const pillColor = (percent: number) => (percent >= 80 ? '#d97757' : percent >= 50 ? '#e8a58c' : '#788c5d')

/** The bar: a track for the whole window, one rect per used slice, a tick at the compaction point. */
export function barSvg(s: Snapshot): string {
  const W = 1000
  const H = 12
  let x = 0
  const rects = s.slices
    .filter(sl => sl.label !== 'free' && sl.tokens > 0)
    .map(sl => {
      const w = Math.max(2, (sl.tokens / s.window) * W)
      const tip = `${sl.label} ${fmt(sl.tokens)} (${sl.percent}%)${sl.note ? ` · ${sl.note}` : ''}${sl.detail ? `\n${sl.detail}` : ''}`.replace(/[<&]/g, '')
      const r = `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${H}" fill="${sl.color}"><title>${tip}</title></rect>`
      x += w
      return r
    })
  const tick = s.threshold ? `<rect x="${Math.min(W - 3, (s.threshold / s.window) * W).toFixed(1)}" y="0" width="3" height="${H}" fill="${TICK}"/>` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none">` +
    `<defs><clipPath id="t"><rect width="${W}" height="${H}" rx="4"/></clipPath></defs>` +
    `<g clip-path="url(#t)"><rect width="${W}" height="${H}" fill="${FREE}" fill-opacity="0.25"/>${rects.join('')}${tick}</g></svg>`
  )
}

/** The bar for surfaces without Svg: `width` cells of █ per used slice, ░ for free, │ at the compaction point, as color runs. */
export function barCells(s: Snapshot, width: number): { color: string; text: string }[] {
  const n = Math.max(10, width)
  const cells: { color: string; ch: string }[] = []
  for (const sl of s.slices) {
    if (sl.label === 'free' || sl.tokens <= 0) continue
    const k = Math.max(1, Math.round((sl.tokens / s.window) * n))
    for (let i = 0; i < k && cells.length < n; i++) cells.push({ color: sl.color, ch: '█' })
  }
  while (cells.length < n) cells.push({ color: FREE, ch: '░' })
  if (s.threshold) cells[Math.min(n - 1, Math.round((s.threshold / s.window) * n))] = { color: TICK, ch: '│' }
  const runs: { color: string; text: string }[] = []
  for (const c of cells) {
    const last = runs[runs.length - 1]
    if (last && last.color === c.color) last.text += c.ch
    else runs.push({ color: c.color, text: c.ch })
  }
  return runs
}
