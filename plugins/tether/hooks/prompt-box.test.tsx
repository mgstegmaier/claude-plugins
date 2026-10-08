import { expect, mock, test } from 'claude-code/testing'

test('two action items pressed in a row stack as paragraphs with the cursor on a fresh line', async ($, on) => {
  mock.clock(on)
  on('ui.toast', () => ({ value: {} }) as never)
  let box = ''
  on('prompt.fill', ($, e) => ((box += e.text), { isFilled: true, text: box, cursor: box.length }) as never)
  await $.tool.call({
    tool: 'mcp__tether__track',
    add: [
      { kind: 'decision', text: 'Restore the hover dim?' },
      { kind: 'choice', text: 'Pills stay or move?', options: ['Stay', 'Move'] },
      { kind: 'question', text: 'Which branch?' },
    ],
  } as never)

  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  await pane.press({ key: 'deny1' })
  await pane.press({ key: 'pick1-2' })
  expect(box).toBe('Denied: Restore the hover dim?\n\nFor "Pills stay or move?", I pick: Move\n\n')

  // Answer waits for typing after its colon, so it gets no blank line.
  await pane.press({ key: 'answer3' })
  expect(box.endsWith('Answer to "Which branch?": ')).toBe(true)
  await pane.unmount()
})

test('Clear all drops every action item unsent', async ($, on) => {
  mock.clock(on)
  on('ui.toast', () => ({ value: {} }) as never)
  await $.tool.call({ tool: 'mcp__tether__track', add: [{ kind: 'decision', text: 'Old ask one?' }, { kind: 'todo', text: 'Old ask two' }] } as never)

  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  await pane.press({ key: 'asks-clear' })
  expect(await pane.find({ type: 'Text', text: 'Old ask one?' })).toBeUndefined()
  expect(await pane.find({ type: 'Text', text: /Nothing waiting on you/ })).toBeDefined()
  expect(await pane.find({ key: 'asks-clear' })).toBeUndefined()
  await pane.unmount()
})
