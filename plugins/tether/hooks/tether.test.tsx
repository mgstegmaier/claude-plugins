import { expect, mock, test } from 'claude-code/testing'
import type { ApiMessage } from 'claude-code'

const transcript: ApiMessage[] = [
  { role: 'user', content: [{ type: 'text', text: 'hi' }] },
  { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'x'.repeat(900) }] },
]
const breakdown = {
  categories: [
    { name: 'System prompt', tokens: 4200, color: '', isDeferred: false, kind: 'used' },
    { name: 'Messages', tokens: 85800, color: '', isDeferred: false, kind: 'used' },
    { name: 'Free space', tokens: 897000, color: '', isDeferred: false, kind: 'free' },
  ],
  totalTokens: 90000, rawMaxTokens: 1_000_000, percentage: 9, autoCompactThreshold: 987000,
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: sections fold, context keeps its bar, Approve clears and Reject drafts`, async ($, on) => {
    const filled: string[] = []
    mock.clock(on)
    on('session.usage', () => ({ value: { context: { window: 1_000_000, breakdown }, cost: { usd: 1.5 } } }) as never)
    on('session.messages', () => ({ value: transcript }) as never)
    on('turn.complete', () => ({ text: '' }) as never)
    on('ui.toast', () => ({ value: {} }) as never)
    on('prompt.fill', ($, e) => (filled.push(e.text), { isFilled: true, text: e.text, cursor: e.text.length }) as never)

    await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
    for (const assumption of ['Scope is the pane only', 'Keep the hotkeys'])
      await $.tool.call({ tool: 'mcp__tether__note_assumption', assumption, basis: 'b', affects: 'a' } as never)

    const pane = await $.ui.mount({ plugin: 'tether', surface, component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })

    // Context starts folded: the header and the bar show, the legend does not.
    expect(await pane.find({ type: 'Text', text: / of 1M/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /compacts at/ })).toBeUndefined()
    expect(await pane.find(surface === 'desktop' ? { type: 'Svg' } : { type: 'Text', text: /█/ })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: 'system prompt' })).toBeUndefined()
    await pane.press({ key: 'fold-context' })
    expect(await pane.find({ type: 'Text', text: 'system prompt' })).toBeDefined()

    // Another section folds the same way.
    expect(await pane.find({ type: 'Text', text: /Tokens and turns count/ })).toBeDefined()
    await pane.press({ key: 'fold-cost' })
    expect(await pane.find({ type: 'Text', text: /Tokens and turns count/ })).toBeUndefined()

    // Approve takes A1 off the panel and sends nothing; Reject drafts a correction.
    await pane.press({ key: 'ok-1' })
    expect(await pane.find({ type: 'Text', text: 'Scope is the pane only' })).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: 'Keep the hotkeys' })).toBeDefined()
    await pane.press({ key: 'wrong-2' })
    expect(filled).toEqual(['Assumption A2 is wrong ("Keep the hotkeys"). Instead: '])

    // No asks yet: the section says so plainly.
    expect(await pane.find({ type: 'Text', text: /Nothing waiting on you/ })).toBeDefined()
    await pane.unmount()
  })
}

test('a quiet session gets no timer writes, so the pane and its context bar stay still', async ($, on) => {
  const clock = mock.clock(on)
  // Count the desk's writes of its stats once the setup is done, seen from beneath the plugins.
  let counting = false
  let writes = 0
  on('state.set', ($, e, next) => {
    if (counting && (e as { key?: string }).key === 'stats') writes++
    return next(e)
  })
  on('session.usage', () => ({ value: { context: { window: 1_000_000, breakdown } } }) as never)
  on('session.messages', () => ({ value: transcript }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  on('session.start', ($, e) => e as never)
  on('command.register', () => ({ value: {} }) as never)
  on('tool.register', () => ({ value: {} }) as never)
  await clock.set(1_000_000)
  await $.session.start({ cwd: '/tmp' } as never)
  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)

  counting = true
  for (let i = 0; i < 90; i++) await clock.advance(1000)
  expect(writes).toBe(0) // no subagent running, nothing on screen moves
})

test('the working-on note starts as a field, saves on Enter, and Edit reopens it', async ($, on) => {
  mock.clock(on)
  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  expect(await pane.find({ key: 'focus-input' })).toBeDefined()
  await pane.input({ key: 'focus-input', text: 'Renaming terminal-desk to tether' })
  expect(await pane.find({ type: 'Text', text: 'Renaming terminal-desk to tether' })).toBeDefined()
  expect(await pane.find({ key: 'focus-input' })).toBeUndefined()
  await pane.press({ key: 'focus-edit' })
  expect(await pane.find({ key: 'focus-input' })).toBeDefined()
  await pane.unmount()
})
