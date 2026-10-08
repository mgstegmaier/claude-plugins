import { expect, mock, test } from 'claude-code/testing'

const mount = ($: Parameters<Parameters<typeof test>[1]>[0], requestId: string) =>
  $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId, props: { bodyColumns: 90 } as never })
const NAMES: Record<string, string> = {
  'working on': 'focus', context: 'context', assumptions: 'assumptions', 'loose ends': 'undone',
  'action items': 'asks', subagents: 'agents', 'cost and tokens': 'cost', changes: 'changes',
}
// The main pane's sections in drawn order, read from their fold buttons ("context ▸").
const labels = async (pane: Awaited<ReturnType<typeof mount>>) =>
  (await pane.findAll({ type: 'Button', label: /[▾▸]$/ }))
    .map(b => NAMES[String((b.props as { label?: string }).label ?? b.text ?? '').replace(/ [▾▸]$/, '')])
    .filter(Boolean)

test('settings hide a section and move another, the main pane follows, and the choice is saved', async ($, on) => {
  mock.clock(on)
  const saved: unknown[] = []
  on('store.set', ($, e) => (saved.push((e as { value: unknown }).value), { value: undefined }) as never)
  const main = await mount($, 'tether')
  const settings = await mount($, 'tether-settings')

  await settings.press({ key: 'set-show-context' })
  await settings.press({ key: 'set-up-changes' })
  expect(await labels(main)).toEqual(['focus', 'assumptions', 'undone', 'asks', 'agents', 'changes', 'cost'])
  expect(saved.at(-1)).toEqual({
    order: ['focus', 'context', 'assumptions', 'undone', 'asks', 'agents', 'changes', 'cost'],
    hidden: ['context'],
  })

  await settings.press({ key: 'set-reset' })
  expect(await labels(main)).toEqual(['focus', 'context', 'assumptions', 'undone', 'asks', 'agents', 'cost', 'changes'])
  await settings.unmount()
  await main.unmount()
})

test('a saved layout loads at session start; unknown ids drop and new sections join at the end', async ($, on) => {
  mock.clock(on)
  mock.store(on, { layout: { order: ['cost', 'gone', 'focus'], hidden: ['agents'] } })
  on('session.start', ($, e) => e as never)
  on('command.register', () => ({ value: {} }) as never)
  on('tool.register', () => ({ value: {} }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  await $.session.start({ cwd: '/tmp' } as never)

  const main = await mount($, 'tether')
  expect(await labels(main)).toEqual(['cost', 'focus', 'context', 'assumptions', 'undone', 'asks', 'changes'])
  await main.unmount()
})
