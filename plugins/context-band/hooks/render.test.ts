import { expect, test } from 'claude-code/testing'
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
const props = { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100 } as never

test('desktop and terminal draw the card after a measure', async ($, on) => {
  // these hooks sit beneath the plugin and answer as the engine would
  on('session.usage', () => ({ value: { context: { window: 1_000_000, breakdown }, cost: { usd: 4.127 } } }) as never)
  on('session.messages', () => ({ value: transcript }) as never)
  on('session.measure', () => ({ changed: [] }) as never)
  on('ui.render', ($, e) => h($.ui.resolve(e).Text, {}, 'engine band') as never) // stands for the engine's own
  await $.session.measure({ context: { window: 1_000_000 }, rateLimits: [], changed: [] } as never)

  const desk = await $.ui.mount({ plugin: 'context-band', surface: 'desktop', component: 'AbovePrompt', props })
  expect(await desk.find({ type: 'Text', text: /compacts at 987k/ })).toBeDefined()
  expect(await desk.find({ type: 'Svg' })).toBeDefined()
  expect(await desk.find({ type: 'Text', text: /~\$4\.13/ })).toBeDefined()
  expect(await desk.find({ type: 'Text', text: /· Bash/ })).toBeUndefined() // collapsed by default
  await desk.press({ key: 'toggle' })
  expect(await desk.find({ type: 'Text', text: /· Bash/ })).toBeDefined()
  // biggest first, free last: tool results ~85k, system prompt 4.2k, tool calls, your prompts
  const order = (await desk.findAll({ type: 'Text', text: /^■ / })).map(t => String(t.text).slice(2).split(' ')[0]).filter(Boolean) // the swatch's own Text matches too
  expect(order).toEqual(['tool', 'system', 'tool', 'your', 'free'])
  await desk.press({ key: 'toggle' })
  expect(await desk.find({ type: 'Text', text: /· Bash/ })).toBeUndefined()
  await desk.unmount()

  const term = await $.ui.mount({ plugin: 'context-band', surface: 'terminal', component: 'AbovePrompt', props })
  expect(await term.find({ type: 'Text', text: /compacts at 987k/ })).toBeDefined()
  expect(await term.find({ type: 'Text', text: /~\$4\.13/ })).toBeDefined()
  expect(await term.find({ type: 'Text', text: /█/ })).toBeDefined() // text bar in place of the Svg
  expect(await term.find({ type: 'Text', text: /│/ })).toBeDefined() // compaction tick
  await term.press({ key: 'toggle' })
  expect(await term.find({ type: 'Text', text: /· Bash/ })).toBeDefined()
  await term.unmount()
})

test('each open legend row holds a hidden detail card its hover reveals', async ($, on) => {
  on('session.usage', () => ({ value: { context: { window: 1_000_000, breakdown } } }) as never)
  on('session.messages', () => ({ value: transcript }) as never)
  on('session.measure', () => ({ changed: [] }) as never)
  on('ui.render', ($, e) => h($.ui.resolve(e).Text, {}, 'engine band') as never)
  await $.session.measure({ context: { window: 1_000_000 }, rateLimits: [], changed: [] } as never)

  const desk = await $.ui.mount({ plugin: 'context-band', surface: 'desktop', component: 'AbovePrompt', props })
  await desk.press({ key: 'toggle' })
  expect(await desk.find({ type: 'Text', text: /hover a row/ })).toBeDefined()
  // find and findAll drop hover, so read it off the drawn tree
  const byKey = (el: any, key: string): any =>
    el?.props?.key === key ? el : (el?.children ?? []).map((c: any) => byKey(c, key)).find(Boolean)
  const row = byKey(await desk.drawn(), 'tool results')
  const card = row?.children?.find((c: any) => c?.props?.position === 'absolute')
  expect(card?.props?.display).toBe('none')
  expect(card?.hover).toEqual({ display: 'flex' })
  await desk.unmount()
})
