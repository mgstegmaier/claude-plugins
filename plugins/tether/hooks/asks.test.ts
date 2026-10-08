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
        // a new to-do, plus a reworded copy of open #1 that the duplicate check must drop
        '{"add":[{"kind":"todo","text":"Run setup.py"},{"kind":"decision","text":"Should I delete the remote branch?"}],"resolve":[4]}',
        // re-adds #5 after the person answered it with a button
        '{"add":[{"kind":"todo","text":"Run setup.py on your machine"}],"resolve":[]}',
      ][haikuCalls - 1]
      return { value: { isAnswered: true, text } } as never
    })
    on('turn.start', ($, e) => ({ turnId: e.turnId }) as never)
    on('turn.complete', () => ({ text: '' }) as never)
    on('prompt.submit', ($, e) => (sent.push(e.text), { text: e.text }) as never)
    const filled: string[] = []
    const toasts: string[] = []
    on('ui.toast', ($, e) => (toasts.push(e.text), { value: {} }) as never)
    on('prompt.fill', ($, e) => (filled.push(e.text), { isFilled: true, text: e.text, cursor: e.text.length }) as never)
    const turn = async (answer: string, during?: () => Promise<unknown>) => {
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

    // turn 2: no ask in the reply, no track, no Haiku
    await turn('I committed the files.')
    expect(haikuCalls).toBe(0)

    // turn 3: an ask without a track call: the backstop adds #5 and resolves #4
    await turn('Can you run setup.py?')
    expect(haikuCalls).toBe(1)
    expect((await $.tool.call({ tool: 'mcp__tether__track' } as never)).text).not.toContain('Should I delete')

    const pane = await $.ui.mount({ plugin: 'tether', surface, component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
    for (const key of ['approve1', 'deny1', 'discuss1', 'pick0-2', 'pick1-2', 'discuss2', 'answer3', 'discuss3', 'dismiss3', 'done5', 'cancel5', 'discuss5'])
      expect(await pane.find({ key })).toBeDefined()
    expect(await pane.find({ key: 'good4' })).toBeUndefined()

    // every button drafts into the prompt box, sends nothing, and keeps the item until track resolves it
    await pane.press({ key: 'discuss1' })
    await pane.press({ key: 'deny1' })
    await pane.press({ key: 'pick1-2' })
    await pane.press({ key: 'answer3' })
    await pane.press({ key: 'cancel5' })
    expect(filled).toEqual([
      'Let\'s discuss "Delete the remote branch?": ',
      'Denied: Delete the remote branch?',
      'For "Which board?", I pick: Platform',
      'Answer to "What is the board id?": ',
      'Not doing this, plan around it: Run setup.py',
    ])
    expect(sent).toEqual([])
    expect(toasts).not.toContain('Sent')
    expect(await pane.find({ key: 'approve1' })).toBeDefined()
    // Dismiss is the one button that drops an item, with no message
    await pane.press({ key: 'dismiss3' })
    expect(await pane.find({ key: 'answer3' })).toBeUndefined()

    // turn 4: the backstop tries to re-add the still-open to-do in other words
    await turn('Did setup.py work?')
    expect(haikuCalls).toBe(2)
    expect((await pane.findAll({ type: 'Text', text: /setup\.py/ })).length).toBe(1)
    await pane.unmount()
  })
}

test('a button reply clears its ask once sent; Discuss and an unsent draft keep theirs', async ($, on) => {
  mock.clock(on)
  on('session.usage', () => ({ value: { context: { window: 1_000_000 } } }) as never)
  on('session.messages', () => ({ value: [] }) as never)
  on('ui.toast', () => ({ value: {} }) as never)
  on('prompt.fill', ($, e) => ({ isFilled: true, text: e.text, cursor: e.text.length }) as never)
  on('prompt.submit', ($, e) => ({ text: e.text }) as never)
  await $.tool.call({
    tool: 'mcp__tether__track',
    add: [
      { kind: 'decision', text: 'Delete the remote branch?' },
      { kind: 'question', text: 'What is the board id?' },
      { kind: 'todo', text: 'Run setup.py' },
    ],
  } as never)
  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  const submit = (text: string) => $.prompt.submit({ text, origin: { kind: 'composer' } } as never)

  await pane.press({ key: 'approve1' })
  expect(await pane.find({ type: 'Text', text: /Clears when you send it/ })).toBeDefined()
  await submit('Approved: Delete the remote branch?')
  expect(await pane.find({ key: 'approve1' })).toBeUndefined()

  await pane.press({ key: 'answer2' })
  await submit('Answer to "What is the board id?": 42') // the person typed after the draft
  expect(await pane.find({ key: 'answer2' })).toBeUndefined()

  await pane.press({ key: 'discuss3' })
  await pane.press({ key: 'done3' })
  await submit('never mind, something else') // the draft was deleted before sending
  expect(await pane.find({ key: 'done3' })).toBeDefined()
  await pane.unmount()
})
