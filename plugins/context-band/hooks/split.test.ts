import { expect, test } from 'claude-code/testing'
import type { ApiMessage, SessionContextBreakdown } from 'claude-code'

import { barCells, barSvg, fmt, measure, splitMessages, toSnapshot } from './split'

const transcript: ApiMessage[] = [
  { role: 'user', content: [{ type: 'text', text: 'read the config' }, { type: 'text', text: '<system-reminder>hook output here</system-reminder>' }] },
  { role: 'assistant', content: [{ type: 'thinking', thinking: 'hmm' }, { type: 'text', text: 'On it.' }, { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'cat x' } }, { type: 'tool_use', id: 't2', name: 'Read', input: { file_path: '/y' } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'x'.repeat(500) }, { type: 'tool_result', tool_use_id: 't2', content: [{ type: 'text', text: 'y'.repeat(100) }] }, { type: 'image', source: {} }] },
]

test('each block lands in its bucket and the top tool is the biggest result', () => {
  const { chars, byTool } = measure(transcript)
  expect(chars.prompts).toBe('read the config'.length)
  expect(chars.injected).toBe('<system-reminder>hook output here</system-reminder>'.length)
  expect(chars.replies).toBe('On it.'.length)
  expect(chars.thinking).toBe(3)
  expect(chars.toolResults).toBe(600)
  expect(chars.images).toBeGreaterThan(0)
  expect(byTool.get('Bash')).toBe(500)
  expect(splitMessages(transcript, 1000).topTool).toBe('Bash')
})

test('the first copy of an engine-counted reminder is skipped; repeats and hook output count as injected', () => {
  const r = (body: string) => ({ type: 'text', text: `<system-reminder>${body}</system-reminder>` })
  const skills = r('The following skills are available for use with the Skill tool: a, b, c')
  const memory = r('Codebase and user instructions are shown below. Contents of CLAUDE.md')
  const hook = r('the plate')
  const { chars } = measure([
    { role: 'user', content: [memory, skills, hook] },
    { role: 'assistant', content: [{ type: 'text', text: 'ok' }] },
    { role: 'user', content: [skills] },
  ])
  expect(chars.injected).toBe(hook.text.length + skills.text.length)
})

test('the split sums exactly to the engine Messages tokens', () => {
  for (const n of [0, 1, 999, 12345]) {
    const { tokens } = splitMessages(transcript, n)
    expect(Object.values(tokens).reduce((a, b) => a + b, 0)).toBe(n)
  }
})

test('fmt matches the mockup', () => {
  expect(fmt(4200)).toBe('4.2k')
  expect(fmt(17000)).toBe('17k')
  expect(fmt(897000)).toBe('897k')
  expect(fmt(1_000_000)).toBe('1M')
  expect(fmt(950)).toBe('950')
})

const breakdown = {
  categories: [
    { name: 'System prompt', tokens: 4200, color: '', isDeferred: false, kind: 'used' },
    { name: 'MCP tools', tokens: 52000, color: '', isDeferred: false, kind: 'used' },
    { name: 'MCP tools (deferred)', tokens: 9000, color: '', isDeferred: true, kind: 'deferred' },
    { name: 'Messages', tokens: 30000, color: '', isDeferred: false, kind: 'used' },
    { name: 'Free space', tokens: 900800, color: '', isDeferred: false, kind: 'free' },
    { name: 'Autocompact buffer', tokens: 13000, color: '', isDeferred: false, kind: 'buffer' },
  ],
  totalTokens: 86200, maxTokens: 1_000_000, rawMaxTokens: 1_000_000, autocompactSource: 'auto',
  percentage: 8.62, gridRows: [], model: 'x', memoryFiles: [], mcpTools: [], agents: [],
  autoCompactThreshold: 987000, isAutoCompactEnabled: true, apiUsage: null,
} as SessionContextBreakdown

test('snapshot replaces Messages with its split, drops deferred and buffer, ends with free', () => {
  const s = toSnapshot(breakdown, transcript)
  const labels = s.slices.map(x => x.label)
  expect(labels[0]).toBe('system prompt')
  expect(labels).not.toContain('messages')
  expect(labels).toContain('tool results')
  expect(labels.some(l => l.includes('deferred') || l.includes('buffer'))).toBe(false)
  expect(labels[labels.length - 1]).toBe('free')
  const used = s.slices.filter(x => x.label !== 'free').reduce((a, x) => a + x.tokens, 0)
  expect(used).toBe(86200)
  expect(s.percent).toBe(9)
  expect(barSvg(s)).toContain('<svg')
})

test('barCells fills exactly the width, slices first, tick at the threshold', () => {
  const s = { used: 300, window: 1000, threshold: 900, percent: 30, slices: [
    { label: 'a', tokens: 200, percent: 20, color: '#111111' },
    { label: 'b', tokens: 100, percent: 10, color: '#222222' },
    { label: 'free', tokens: 700, percent: 70, color: '#b0aea5' },
  ] }
  const runs = barCells(s, 20)
  expect(runs.map(r => r.text).join('')).toBe('████' + '██' + '░'.repeat(12) + '│' + '░')
  expect(runs[0]).toEqual({ color: '#111111', text: '████' })
})

test('injected tokens are attributed to the hook event that wrote them, the rest to the engine', () => {
  const r = (body: string) => ({ type: 'text', text: `<system-reminder>${body}</system-reminder>` })
  const { bySource } = measure([{ role: 'user', content: [
    r('SessionStart:startup hook success: # The plate ' + 'x'.repeat(100)),
    r('UserPromptSubmit hook additional context: notes'),
    r('The date has changed.'),
  ] }])
  expect([...bySource.keys()].sort()).toEqual(['SessionStart', 'UserPromptSubmit', 'engine'])
  expect(bySource.get('SessionStart')).toBeGreaterThan(bySource.get('UserPromptSubmit')!)
})

test('each slice carries a detail, with its biggest contributors where the breakdown names them', () => {
  const b = {
    categories: [
      { name: 'Memory files', tokens: 7000, color: '', isDeferred: false, kind: 'used' },
      { name: 'MCP tools', tokens: 900, color: '', isDeferred: false, kind: 'used' },
      { name: 'Skills', tokens: 500, color: '', isDeferred: false, kind: 'used' },
      { name: 'MCP server instructions', tokens: 686, color: '', isDeferred: false, kind: 'used' },
      { name: 'Some future row', tokens: 10, color: '', isDeferred: false, kind: 'used' },
      { name: 'Messages', tokens: 1000, color: '', isDeferred: false, kind: 'used' },
      { name: 'Free space', tokens: 990000, color: '', isDeferred: false, kind: 'free' },
    ],
    totalTokens: 9400, rawMaxTokens: 1_000_000, percentage: 1,
    memoryFiles: [{ path: '/u/.claude/CLAUDE.md', type: 'User', tokens: 5000 }, { path: '/r/CLAUDE.md', type: 'Project', tokens: 2000 }],
    mcpTools: [{ name: 'a', serverName: 'monday', tokens: 600, isLoaded: true }, { name: 'b', serverName: 'notion', tokens: 300, isLoaded: false }],
    agents: [],
    skills: { totalSkills: 2, includedSkills: 2, tokens: 500, skillFrontmatter: [{ name: 's1', source: 'plugin', pluginName: 'ponytail', tokens: 300 }, { name: 's2', source: 'user', tokens: 200 }] },
  } as unknown as SessionContextBreakdown
  const s = toSnapshot(b, transcript)
  const d = (label: string) => s.slices.find(x => x.label === label)?.detail ?? ''
  expect(d('memory files')).toContain('Biggest: .claude/CLAUDE.md 5k, r/CLAUDE.md 2k.')
  expect(d('mcp tools')).toContain('monday 600')
  expect(d('mcp tools')).not.toContain('notion') // not loaded, so not in the window
  expect(d('skills')).toContain('ponytail 300, user 200')
  expect(d('tool results')).toContain('Bash')
  expect(d('free')).toContain('compacts')
  expect(d('mcp server instructions')).toContain('MCP servers send')
  expect(d('some future row')).toContain('/context') // a row the engine adds later still gets a card
  expect(barSvg(s)).toContain('Biggest:') // the desktop bar's segment titles carry it too
})
