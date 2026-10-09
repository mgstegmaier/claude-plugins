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
// `batch` is the main turn it was added in; absent on ones stored before 0.10.0, which count as turn 0.
export type Ask = { id: number; kind: AskKind; text: string; options?: string[]; drafted?: string; batch?: number }

export type Undone = {
  id: number
  text: string
  source: 'said' | 'code' | 'checker'
  at: number
  // The main turn count when it was recorded; absent on ones stored before 0.7.0, which count as turn 0.
  turn?: number
  status: 'open' | 'sent' | 'cleared'
}

// A call that reached outside the machine or is hard to undo: a push, a merge, a delete, an install, an MCP write.
export type Effect = { at: number; text: string; isFailed: boolean; agent: string | null }
// A file Claude edited this session, and how many times.
export type Touched = { path: string; edits: number; at: number }

// The main pane's section order and the sections the person hid.
export type Layout = { order: string[]; hidden: string[] }

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
  effects: Effect[]
  touched: Touched[]
  lastEditAt: number
  lastCheck: { at: number; isPassed: boolean; text: string } | null
}

declare module 'claude-code' {
  interface PluginState {
    tether: { stats: Stats; collapsed: string[]; focus: string; isEditingFocus: boolean; isFocusCustom: boolean; asks: Ask[]; nextAsk: number; closedAsks: string[]; askBatch: number; layout: Layout }
  }
}
