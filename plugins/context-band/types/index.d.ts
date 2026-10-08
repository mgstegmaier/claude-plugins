export type Slice = { label: string; tokens: number; percent: number; color: string; note?: string; detail?: string }

export type Snapshot = {
  slices: Slice[] // used slices in legend order, free last
  used: number
  window: number
  threshold?: number
  percent: number
  cost?: number // US dollars so far at list API rates, as /cost totals it
}

declare module 'claude-code' {
  interface PluginState {
    'context-band': { snapshot: Snapshot | null; isOpen: boolean }
  }
}
