import { expect, mock, test } from 'claude-code/testing'

import { isDuplicate, looksLikeAsk, parseChange } from './asks'

declare const setTimeout: (run: () => void, ms: number) => unknown // the test runtime has it; the plugin types don't declare it

test('parseChange keeps valid items, demotes a choice without options, survives junk', () => {
  expect(
    parseChange(
      'ok {"add":[{"kind":"decision","text":"Ship it?"},{"kind":"nope","text":"x"},{"kind":"choice","text":"A or?","options":["A"]},{"kind":"choice","text":"A or B?","options":["A","B"]}],"resolve":[3,"a"]}',
    ),
  ).toEqual({
    add: [
      { kind: 'decision', text: 'Ship it?' },
      { kind: 'question', text: 'A or?' },
      { kind: 'choice', text: 'A or B?', options: ['A', 'B'] },
    ],
    resolve: [3],
  })
  expect(parseChange('no json here')).toEqual({ add: [], resolve: [] })
})

test('looksLikeAsk gates the backstop', () => {
  expect(looksLikeAsk('Should I push it?')).toBe(true)
  expect(looksLikeAsk('Run setup.py on your machine.')).toBe(true)
  expect(looksLikeAsk('I committed the two files.')).toBe(false)
})

test('isDuplicate catches rewordings, keeps different asks apart (real pairs from 2026-10-07)', () => {
  expect(
    isDuplicate('Start a new session so open-asks runs from the marketplace install instead of the dev-mods session copy', [
      "Start a new session (or run /reload-plugins) so open-asks runs from the marketplace install instead of this session's dev-mods copy",
    ]),
  ).toBe(true)
  expect(
    isDuplicate('Delete the leftover trial files (~/.claude/mods/open-asks folder and settings backups)?', [
      'Delete the leftover trial files: the ~/.claude/mods/open-asks folder and the backups ~/.claude/settings.json.bak-open-asks and .bak-open-asks-2?',
    ]),
  ).toBe(true)
  expect(
    isDuplicate('Delete the remote branch origin/feat/open-asks on GitHub? PR #18 already merged it into main as 3e23eb1.', [
      'Delete the remote branch origin/feat/context-band-cost on GitHub? Its work is already on main through PR #17.',
    ]),
  ).toBe(false)
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`${surface}: track adds, backstop runs only when track didn't, buttons draft the right message`, async ($, on) => {
    let haikuCalls = 0
    mock.clock(on)
    on('session.usage', () => ({ value: { context: { window: 1_000_000 } } }) as never)
    on('session.messages', () => ({ value: [] }) as never)
    const sent: string[] = []
    on('model.complete', () => {
      haikuCalls++
      const text = [
        // a new to-do, plus a reworded copy of itself that the duplicate check must drop
        '{"add":[{"kind":"todo","text":"Run setup.py"},{"kind":"todo","text":"Run setup.py on your machine"}],"resolve":[]}',
        // the next reply asks it again: the list emptied on send, so it comes back once
        '{"add":[{"kind":"todo","text":"Run setup.py on your machine"}],"resolve":[]}',
      ][haikuCalls - 1]
      return { value: { isAnswered: true, text } } as never
    })
    on('turn.start', ($, e) => ({ turnId: e.turnId }) as never)
    on('turn.complete', () => ({ text: '' }) as never)
    on('prompt.submit', ($, e) => (sent.push(e.text), { text: e.text }) as never)
  const track = async (add: { kind: string; text: string }[] = [], resolve: number[] = []) =>
    (await $.tool.call({ tool: 'mcp__tether__track', add, resolve } as never)).text
    const filled: string[] = []
    const toasts: string[] = []
    on('ui.toast', ($, e) => (toasts.push(e.text), { value: {} }) as never)
    on('prompt.fill', ($, e) => (filled.push(e.text), { isFilled: true, text: e.text, cursor: e.text.length }) as never)
    const turn = async (answer: string, during?: () => Promise<unknown>, prompt?: string) => {
      if (prompt !== undefined) await $.prompt.submit({ text: prompt, origin: { kind: 'composer' } } as never)
      await $.turn.start({ text: 'hi', turnId: answer } as never)
      await during?.()
      await $.turn.complete({ answer, durationMs: 1, isAborted: false, turnId: answer, reason: 'answer' } as never)
      await new Promise<void>(done => setTimeout(done, 20)) // the backstop runs off the turn's path
    }

    // turn 1: the main model tracks its own asks, so no Haiku call
    await turn('Lots of asks?', () =>
      $.tool.call({
        tool: 'mcp__tether__track',
        add: [
          { kind: 'decision', text: 'Delete the remote branch?' },
          { kind: 'choice', text: 'Which board?', options: ['DE Requests', 'Platform'] },
          { kind: 'question', text: 'What is the board id?' },
          { kind: 'review', text: 'Check the pane layout' },
        ],
      } as never),
    )
    expect(haikuCalls).toBe(0)

    const pane = await $.ui.mount({ plugin: 'tether', surface, component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
    for (const key of ['approve1', 'deny1', 'discuss1', 'pick0-2', 'pick1-2', 'discuss2', 'answer3', 'discuss3', 'dismiss3', 'good4'])
      expect(await pane.find({ key })).toBeDefined()

    // every button drafts into the prompt box, sends nothing, and keeps the item
    await pane.press({ key: 'discuss1' })
    await pane.press({ key: 'deny1' })
    await pane.press({ key: 'pick1-2' })
    await pane.press({ key: 'answer3' })
    expect(await pane.find({ key: 'approve1' })).toBeDefined()
    // Dismiss is the one button that drops an item, with no message
    await pane.press({ key: 'dismiss3' })
    expect(await pane.find({ key: 'answer3' })).toBeUndefined()
    expect(filled).toEqual([
      'Let\'s discuss "Delete the remote branch?": ',
      'Denied: Delete the remote branch?\n\n',
      'For "Which board?", I pick: Platform\n\n',
      'Answer to "What is the board id?": ',
    ])
    expect(sent).toEqual([])
    expect(toasts).not.toContain('Sent')

    // turn 2: the person sends something; every ask clears. No ask in the reply, no track, no Haiku.
    await turn('I committed the files.', undefined, 'Commit it')
    expect(haikuCalls).toBe(0)
    expect(await track()).toBe('No action items.')
    for (const key of ['approve1', 'pick0-2', 'good4']) expect(await pane.find({ key })).toBeUndefined()

    // turn 3: an ask without a track call: the backstop adds #5 and drops its own rewording
    await turn('Can you run setup.py?', undefined, 'What next?')
    expect(haikuCalls).toBe(1)
    expect(await track()).toBe('Action items:\n#5 [todo] Run setup.py')
    for (const key of ['done5', 'cancel5', 'discuss5']) expect(await pane.find({ key })).toBeDefined()

    // turn 4: the reply asks again after a send, so it is back, once
    await turn('Did setup.py work?', undefined, 'Not yet')
    expect(haikuCalls).toBe(2)
    expect((await pane.findAll({ type: 'Text', text: /setup\.py/ })).length).toBe(1)
    expect(await pane.find({ key: 'done6' })).toBeDefined()
    await pane.unmount()
  })
}

test('a sent message empties the list; a turn with no send keeps it; resolve drops one', async ($, on) => {
  mock.clock(on)
  on('session.usage', () => ({ value: { context: { window: 1_000_000 } } }) as never)
  on('session.messages', () => ({ value: [] }) as never)
  on('ui.toast', () => ({ value: {} }) as never)
  on('prompt.fill', ($, e) => ({ isFilled: true, text: e.text, cursor: e.text.length }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text }) as never)
  on('turn.start', ($, e) => ({ turnId: e.turnId }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  const track = async (add: { kind: string; text: string }[] = [], resolve: number[] = []) =>
    (await $.tool.call({ tool: 'mcp__tether__track', add, resolve } as never)).text
  const submit = (text: string) => $.prompt.submit({ text, origin: { kind: 'composer' } } as never)
  const turn = async (id: string, during: () => Promise<unknown>) => {
    await $.turn.start({ text: 'hi', turnId: id } as never)
    await during()
    await $.turn.complete({ answer: 'Done.', durationMs: 1, isAborted: false, turnId: id, reason: 'answer' } as never)
  }

  await turn('a', async () => {
    await track([{ kind: 'todo', text: 'Run setup.py' }])
    await track([{ kind: 'question', text: 'What is the board id?' }])
  })
  expect(await track()).toBe('Action items:\n#1 [todo] Run setup.py\n#2 [question] What is the board id?')

  // a turn nobody sent (a background task finishing) adds to the list rather than clearing it
  await turn('b', () => track([{ kind: 'decision', text: 'Push the branch?' }], [2]))
  expect(await track()).toBe('Action items:\n#1 [todo] Run setup.py\n#3 [decision] Push the branch?')

  // a drafted reply, a Discuss, or something unrelated: any send empties the list
  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  await pane.press({ key: 'discuss3' })
  await submit('never mind, something else')
  expect(await pane.find({ key: 'done1' })).toBeUndefined()
  expect(await pane.find({ key: 'approve3' })).toBeUndefined()
  expect(await track()).toBe('No action items.')
  await pane.unmount()
})
