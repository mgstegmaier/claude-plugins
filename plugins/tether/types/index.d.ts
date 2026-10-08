export type Assumption = {
  id: number
  text: string
  basis: string
  affects: string
  at: number
  agent: string | null
  status: 'open' | 'replaced' | 'flagged' | 'cleared'
  replacedBy: number | null
}

export type AskKind = 'decision' | 'choice' | 'todo' | 'question' | 'review'
// `drafted`: the reply a button put in the prompt box; sending it clears the ask.
export type Ask = { id: number; kind: AskKind; text: string; options?: string[]; drafted?: string }

export type Undone = {
  id: number
  text: string
  source: 'said' | 'code' | 'checker'
  at: number
  status: 'open' | 'sent' | 'cleared'
}

// The context bar's model, the same as context-band's.
export type Slice = { label: string; tokens: number; percent: number; color: string; note?: string; detail?: string }

export type Snapshot = {
  slices: Slice[] // used slices in legend order, free last
  used: number
  window: number
  threshold?: number
  percent: number
  cost?: number
}

export type AgentRow = {
  id: string
  label: string
  type: string
  model: string | null
  startedAt: number
  endedAt: number | null
  lastSeenAt: number
  isSpawned: boolean
  tools: number
  tokensRead: number
  tokensOut: number
  hasFailed: boolean
}

export type Stats = {
  openedAt: number
  now: number
  turns: number
  tools: number
  fails: number
  freshTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outTokens: number
  costUsd: number | null
  ctxPercent: number | null
  ctxTokens: number | null
  ctxWindow: number | null
  snapshot: Snapshot | null
  deferredTokens: number
  assumptions: Assumption[]
  nextNote: number
  agents: AgentRow[]
  needsMeasure: boolean
  undone: Undone[]
  nextUndone: number
  lastPrompt: string
  turnTools: number
  isChecking: boolean
  tickError: string
}

declare module 'claude-code' {
  interface PluginState {
    tether: { stats: Stats; collapsed: string[]; focus: string; isEditingFocus: boolean; isFocusCustom: boolean; asks: Ask[]; nextAsk: number; closedAsks: string[] }
  }
}
