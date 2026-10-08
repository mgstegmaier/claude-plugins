import { expect, mock, test } from 'claude-code/testing'

test('working on follows the session title until the person saves a note, and clearing it hands it back', async ($, on) => {
  mock.clock(on)
  on('classic.UserPromptSubmit', () => ({}) as never)
  on('classic.SessionStart', () => ({}) as never)
  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })

  // The first prompt has no title yet; the second brings it.
  await $.classic.UserPromptSubmit({ prompt: 'hi' } as never)
  expect(await pane.find({ key: 'focus-input' })).toBeDefined()
  await $.classic.UserPromptSubmit({ prompt: 'next', session_title: 'Tether fixes' } as never)
  expect(await pane.find({ type: 'Text', text: 'Tether fixes' })).toBeDefined()

  // A renamed session moves the note while the person hasn't written one.
  await $.classic.UserPromptSubmit({ prompt: 'more', session_title: 'Tether title sync' } as never)
  expect(await pane.find({ type: 'Text', text: 'Tether title sync' })).toBeDefined()

  // The person's own note wins over later titles.
  await pane.press({ key: 'focus-edit' })
  await pane.input({ key: 'focus-input', text: 'Seed working-on from the title' })
  await $.classic.UserPromptSubmit({ prompt: 'again', session_title: 'Something else' } as never)
  expect(await pane.find({ type: 'Text', text: 'Seed working-on from the title' })).toBeDefined()

  // Clearing the note hands it back to the title.
  await pane.press({ key: 'focus-edit' })
  await pane.input({ key: 'focus-input', text: '' })
  await $.classic.SessionStart({ source: 'resume', session_title: 'Back to the title' } as never)
  expect(await pane.find({ type: 'Text', text: 'Back to the title' })).toBeDefined()
  await pane.unmount()
})
