import { expect, mock, test } from 'claude-code/testing'

const quiet = (on: Parameters<Parameters<typeof test>[1]>[1]) => {
  on('session.usage', () => ({ value: { context: { window: 1_000_000 } } }) as never)
  on('session.messages', () => ({ value: [] }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  on('ui.toast', () => ({ value: {} }) as never)
}
const answer = (text: string) => ({ answer: text, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' }) as never

test('the pane opens itself when the session starts', async ($, on) => {
  mock.clock(on)
  const opened: string[] = []
  on('session.start', ($, e) => e as never)
  on('command.register', () => ({ value: {} }) as never)
  on('tool.register', () => ({ value: {} }) as never)
  on('ui.open', ($, e) => (opened.push(e.id), { value: { isPlaced: true } }) as never)
  await $.session.start({ cwd: '/tmp' } as never)
  expect(opened).toEqual(['tether'])
})

test('a put-off sentence becomes the checker\'s concrete action, never the raw sentence, and a rewording is not re-added', async ($, on) => {
  mock.clock(on)
  quiet(on)
  const prompts: string[] = []
  let reply = 'Deploy tether 0.4.1 with claude plugin update tether@heckatron'
  on('model.complete', ($, e) => (prompts.push(e.prompt), { value: { isAnswered: true, text: reply, usage: {} } }) as never)

  await $.turn.complete(answer('Done with the pane. I haven\'t deployed it.'))
  await new Promise(r => setTimeout(r, 0))
  expect(prompts[0]).toContain("I haven't deployed it.")

  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  expect(await pane.find({ type: 'Text', text: reply })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: "I haven't deployed it." })).toBeUndefined()

  reply = 'Deploy tether 0.4.1 by running claude plugin update tether@heckatron'
  await $.turn.complete(answer('I haven\'t deployed it yet.'))
  await new Promise(r => setTimeout(r, 0))
  expect(await pane.find({ type: 'Text', text: reply })).toBeUndefined()
  await pane.unmount()
})

test('a list lead-in the checker answers NONE for adds nothing', async ($, on) => {
  mock.clock(on)
  quiet(on)
  on('model.complete', () => ({ value: { isAnswered: true, text: 'NONE', usage: {} } }) as never)
  await $.turn.complete(answer('What I left alone:\n- the README, unchanged on purpose'))
  await new Promise(r => setTimeout(r, 0))
  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  expect(await pane.find({ type: 'Text', text: /Nothing flagged/ })).toBeDefined()
  await pane.unmount()
})

test('Clear drops one loose end and Do now drafts another', async ($, on) => {
  mock.clock(on)
  quiet(on)
  const filled: string[] = []
  on('prompt.fill', ($, e) => (filled.push(e.text), { isFilled: true, text: e.text, cursor: e.text.length }) as never)
  on('tool.call', () => ({ result: '' }) as never)
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: '', new_string: '// TODO wire the retry' } as never)
  await $.tool.call({ tool: 'Edit', file_path: '/x/b.ts', old_string: '', new_string: '// FIXME parse dates' } as never)

  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  expect(await pane.find({ type: 'Button', label: 'a Do now' })).toBeDefined()
  await pane.press({ key: 'clear-1' })
  expect(await pane.find({ type: 'Text', text: /wire the retry/ })).toBeUndefined()
  expect(await pane.find({ type: 'Text', text: /parse dates/ })).toBeDefined()
  await pane.press({ key: 'do-2' })
  expect(filled).toEqual(['You left this undone: "Finish "// FIXME parse dates" in b.ts". Do it now.\n\n'])
  await pane.unmount()
})

test('the checker clears open loose ends that the latest report settles', async ($, on) => {
  mock.clock(on)
  quiet(on)
  const prompts: string[] = []
  let reply = 'Push branch fix/retry and open a pull request against main'
  on('model.complete', ($, e) => (prompts.push(e.prompt), { value: { isAnswered: true, text: reply, usage: {} } }) as never)
  await $.turn.complete(answer("I haven't pushed it."))
  await new Promise(r => setTimeout(r, 0))

  // The next turn has no put-off sentence, but a loose end is open, so the checker still runs and sees it.
  reply = 'NONE\nRESOLVED: U1'
  await $.turn.complete(answer('Pushed fix/retry and opened the pull request.'))
  await new Promise(r => setTimeout(r, 0))
  expect(prompts[1]).toContain('U1 Push branch fix/retry')

  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  expect(await pane.find({ type: 'Text', text: /Nothing flagged/ })).toBeDefined()
  await pane.unmount()
})

test(`a loose end still open after ${10} turns clears itself`, async ($, on) => {
  mock.clock(on)
  quiet(on)
  on('model.complete', () => ({ value: { isAnswered: true, text: 'NONE', usage: {} } }) as never)
  on('tool.call', () => ({ result: '' }) as never)
  await $.tool.call({ tool: 'Edit', file_path: '/x/a.ts', old_string: '', new_string: '// TODO wire the retry' } as never)

  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  for (let i = 0; i < 9; i++) await $.turn.complete(answer('ok'))
  expect(await pane.find({ type: 'Text', text: /wire the retry/ })).toBeDefined()
  await $.turn.complete(answer('ok'))
  expect(await pane.find({ type: 'Text', text: /wire the retry/ })).toBeUndefined()
  await pane.unmount()
})
