import { describe, expect, mock, test } from 'claude-code/testing'

// Decisions empty on every send; needs-you todos stay until Done, Clear or the session's end.
const setup = (on: Parameters<Parameters<typeof test>[1]>[1]) => {
  const clock = mock.clock(on)
  on('ui.toast', () => ({ value: {} }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text }) as never)
  return clock
}
const track = ($: Parameters<Parameters<typeof test>[1]>[0], add: { kind: string; text: string }[] = []) =>
  $.tool.call({ tool: 'mcp__tether__track', add } as never)
const send = ($: Parameters<Parameters<typeof test>[1]>[0], text: string) =>
  $.prompt.submit({ text, origin: { kind: 'composer' } } as never)
const mount = ($: Parameters<Parameters<typeof test>[1]>[0]) =>
  $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })

describe('needs you', () => {
  test('todos survive a send while decisions clear', async ($, on) => {
    setup(on)
    await track($, [{ kind: 'todo', text: 'Rotate the staging key' }, { kind: 'decision', text: 'Push the branch?' }])
    await send($, 'what is the status?')
    expect((await track($)).text).toBe('Needs you:\n#1 [todo] Rotate the staging key')
  })

  test('sending the Done or cancel draft clears that todo only', async ($, on) => {
    setup(on)
    await track($, [{ kind: 'todo', text: 'Rotate the staging key' }, { kind: 'todo', text: 'Email the vendor' }, { kind: 'todo', text: 'Book the room' }])
    await send($, 'Done: Rotate the staging key\n\n')
    expect((await track($)).text).toBe('Needs you:\n#2 [todo] Email the vendor\n#3 [todo] Book the room')
    await send($, 'ok. Not doing this, plan around it: Email the vendor')
    expect((await track($)).text).toBe('Needs you:\n#3 [todo] Book the room')
  })

  test('Done drafts its message, Clear removes one todo with no message', async ($, on) => {
    setup(on)
    let box = ''
    on('prompt.fill', ($, e) => ((box += e.text), { isFilled: true, text: box, cursor: box.length }) as never)
    await track($, [{ kind: 'todo', text: 'Rotate the staging key' }, { kind: 'todo', text: 'Email the vendor' }])
    const pane = await mount($)
    expect(await pane.find({ key: 'cancel1' })).toBeUndefined()
    await pane.press({ key: 'done1' })
    expect(box).toBe('Done: Rotate the staging key\n\n')
    await pane.press({ key: 'clear1' })
    expect(box).toBe('Done: Rotate the staging key\n\n')
    expect(await pane.find({ type: 'Text', text: 'Rotate the staging key' })).toBeUndefined()
    expect(await pane.find({ type: 'Text', text: 'Email the vendor' })).toBeDefined()
    await pane.unmount()
  })

  test('a todo that repeats an open one is not added twice', async ($, on) => {
    setup(on)
    await track($, [{ kind: 'todo', text: 'Rotate the staging key' }])
    await track($, [{ kind: 'todo', text: 'Rotate the staging key' }, { kind: 'todo', text: 'Rotate staging key' }])
    await send($, 'hello')
    await track($, [{ kind: 'todo', text: 'Rotate the staging key' }])
    expect((await track($)).text).toBe('Needs you:\n#1 [todo] Rotate the staging key')
  })

  test('todos render under needs you with their age, the rest under decisions', async ($, on) => {
    const clock = setup(on)
    await clock.set(1_000_000)
    await track($, [{ kind: 'todo', text: 'Rotate the staging key' }, { kind: 'decision', text: 'Push the branch?' }])
    await clock.advance(5 * 60_000)
    const pane = await mount($)
    const labels = (await pane.findAll({ type: 'Button', label: /[▾▸]$/ })).map(b => String((b.props as { label?: string }).label ?? b.text))
    expect(labels).toContain('decisions ▾')
    expect(labels).toContain('needs you ▾')
    expect(await pane.find({ type: 'Text', text: 'added 5m ago' })).toBeDefined()
    expect(await pane.find({ key: 'approve2' })).toBeDefined()
    expect(await pane.find({ key: 'approve1' })).toBeUndefined()
    expect(await pane.find({ key: 'done1' })).toBeDefined()
    await pane.unmount()
    await clock.advance(2 * 3_600_000)
    await send($, 'hi')
    const again = await mount($)
    expect(await again.find({ type: 'Text', text: 'added 2h ago' })).toBeDefined()
    await again.unmount()
  })
})
