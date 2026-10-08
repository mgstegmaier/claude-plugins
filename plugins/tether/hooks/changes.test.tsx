import { expect, mock, test } from 'claude-code/testing'

import type { Stats } from '../types'
import { checkState, footprint } from './changes'

const blank = { effects: [], touched: [], lastEditAt: 0, lastCheck: null } as unknown as Stats
const bash = (command: string, failed = false) => footprint(blank, 'Bash', { command }, 5, failed, null)

test('commands that reach outside the machine are logged; local ones are not', () => {
  for (const c of ['git push -u origin main', 'gh pr merge 5 --squash', 'git push origin --delete old', 'rm -rf build', 'cd x && rm notes.txt', 'claude plugin update tether@mgstegmaier', 'curl -X POST https://x', 'git branch -D old'])
    expect(bash(c).effects?.[0]?.text, c).toBe(c)
  for (const c of ['git status', 'git log --oneline', 'gh pr view 5', 'ls -la', 'grep -rn rm src', 'claude plugin list', 'curl https://x'])
    expect(bash(c).effects, c).toBeUndefined()
})

test('MCP writes are logged by server and action; reads and tether\'s own tools are not', () => {
  expect(footprint(blank, 'mcp__monday__create_item', {}, 1, false, null).effects?.[0]?.text).toBe('monday create_item')
  expect(footprint(blank, 'mcp__monday__get_board_info', {}, 1, false, null).effects).toBeUndefined()
  expect(footprint(blank, 'mcp__tether__track', {}, 1, false, null).effects).toBeUndefined()
})

test('edits count per file, and the check state follows the last edit', () => {
  let s = { ...blank, ...footprint(blank, 'Edit', { file_path: '/r/a.ts' }, 10, false, null) } as Stats
  s = { ...s, ...footprint(s, 'Edit', { file_path: '/r/a.ts' }, 20, false, null) } as Stats
  expect(s.touched).toEqual([{ path: '/r/a.ts', edits: 2, at: 20 }])
  expect(checkState(s)).toBe('unchecked')
  s = { ...s, ...footprint(s, 'Bash', { command: 'claude plugin test .' }, 30, false, null) } as Stats
  expect(checkState(s)).toBe('passed')
  s = { ...s, ...footprint(s, 'Bash', { command: 'npm test' }, 40, true, null) } as Stats
  expect(checkState(s)).toBe('failed')
  s = { ...s, ...footprint(s, 'Write', { file_path: '/r/b.ts' }, 50, false, null) } as Stats
  expect(checkState(s)).toBe('unchecked')
  expect(checkState(blank)).toBe('none')
})

test('the changes section starts folded with a summary, and unfolds to the log', async ($, on) => {
  mock.clock(on)
  on('tool.call', () => ({ result: '' }) as never)
  await $.tool.call({ tool: 'Bash', command: 'git push -u origin main' } as never)
  await $.tool.call({ tool: 'Edit', file_path: '/repo/hooks/a.ts', old_string: 'x', new_string: 'y' } as never)

  const pane = await $.ui.mount({ plugin: 'tether', surface: 'desktop', component: 'Pane', requestId: 'tether', props: { bodyColumns: 90 } as never })
  expect(await pane.find({ type: 'Text', text: '1 outside · 1 files · unchecked' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /git push -u origin main/ })).toBeUndefined()
  await pane.press({ key: 'fold-changes' })
  expect(await pane.find({ type: 'Text', text: '✓ git push -u origin main' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: 'hooks/a.ts' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /Not checked since the last edit/ })).toBeDefined()
  await pane.unmount()
})
