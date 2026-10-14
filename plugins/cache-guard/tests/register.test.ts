import { describe, expect, mock, test, tier } from 'claude-code/testing'
import type { On, PromptSubmitInput, SessionStartInput, TurnCompleteInput, TurnUsage } from 'claude-code'

tier('user')

const HOUR = 60 * 60 * 1000
const START = 1_000_000

const session: SessionStartInput = { surface: null, isInteractive: false, cwd: '/work' }

const usage = (over: Partial<TurnUsage> = {}): TurnUsage => ({
  input_tokens: 2, output_tokens: 10, cache_read_input_tokens: 200000, cache_creation_input_tokens: 500, model: 'claude-fable-5-1', ...over,
})

let turns = 0
const turn = (): TurnCompleteInput => ({
  answer: 'ok', durationMs: 1000, isAborted: false, turnId: 't' + ++turns, reason: 'answer', usage: usage(),
})

const prompt = (text: string): PromptSubmitInput => ({ text, wait: false, origin: { kind: 'composer' } })

// The engine beneath the mod; `answer` is the dialog pick, null for a dismissed dialog.
function world(on: On, answer: string | null, commands: string[] = []) {
  const entered: string[] = []
  const asked: string[] = []
  const filled: string[] = []
  const ran: string[] = []
  const logs: string[] = []
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.model', () => ({ value: 'claude-fable-5-1' }))
  on('session.usage', () => ({ value: { startedAt: START, context: { window: 1000000, tokens: undefined }, rateLimits: [] } }))
  on('command.list', () => ({ value: commands.map(name => ({ name, description: '', source: 'plugin' as const })) }))
  on('classic.SessionStart', () => ({}))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('session.compact', ($, e) => ({ messages: e.messages }))
  on('prompt.submit', ($, e) => { entered.push(e.text); return { text: e.text } })
  on('ui.log', ($, e) => { logs.push(e.text); return { value: undefined } })
  on('tool.call', ($, e) => {
    const q = (e as unknown as { questions: { question: string }[] }).questions[0].question
    asked.push(q)
    return (answer === null ? { deny: 'dismissed' } : { result: { questions: [], answers: { [q]: answer } } }) as never
  })
  on('prompt.fill', ($, e) => (filled.push(e.text), { isFilled: true, text: e.text, cursor: e.text.length }) as never)
  on('command.run', ($, e) => (ran.push(e.command), { text: '' }) as never)
  return { entered, asked, filled, ran, logs }
}

// One turn, then a gap, then a send; settles the deferred /clear before returning.
async function send($: Parameters<Parameters<typeof test>[1]>[0], clock: { advance: (ms: number) => Promise<void> }, gap: number) {
  await $.turn.complete(turn())
  await clock.advance(gap)
  const r = await $.prompt.submit(prompt('hi'))
  await clock.advance(1)
  await new Promise<void>(done => setTimeout(done, 20))
  return r
}

describe('cache-guard', () => {
  test('a warm send goes straight through with no dialog', async ($, on) => {
    const clock = mock.clock(on, { now: START })
    const w = world(on, 'Proceed')
    await $.session.start(session)
    const r = await send($, clock, 30 * 60 * 1000)
    expect(r.drop).toBe(undefined)
    expect(w.asked).toEqual([])
    expect(w.entered).toEqual(['hi'])
  })

  test('Proceed sends the cold prompt after a dialog with the price', async ($, on) => {
    const clock = mock.clock(on, { now: START })
    const w = world(on, 'Proceed')
    await $.session.start(session)
    const r = await send($, clock, 3 * HOUR)
    expect(w.asked[0]).toMatch(/went cold 2h00m ago\. Sending this re-writes up to 200,502 tokens at \$20\/MTok = \$4\.01 .* Send it anyway\?/)
    expect(r.drop).toBe(undefined)
    expect(w.entered).toEqual(['hi'])
    expect(w.filled).toEqual([])
  })

  test('Start new session drops it, runs /clear and puts the prompt back', async ($, on) => {
    const clock = mock.clock(on, { now: START })
    const w = world(on, 'Start new session')
    await $.session.start(session)
    const r = await send($, clock, 3 * HOUR)
    expect(r.drop).toMatch(/starting fresh with \/clear/)
    expect(w.entered).toEqual([])
    expect(w.ran).toEqual(['clear'])
    expect(w.filled).toEqual(['hi'])
  })

  test('a dismissed dialog refuses once, puts the prompt back, and the resend goes through', async ($, on) => {
    const clock = mock.clock(on, { now: START })
    const w = world(on, null)
    await $.session.start(session)
    const r = await send($, clock, 3 * HOUR)
    expect(r.drop).toMatch(/back in the box; send it again/)
    expect(w.filled).toEqual(['hi'])
    await $.prompt.submit(prompt('hi'))
    expect(w.entered).toEqual(['hi'])
    expect(w.asked.length).toBe(1)
  })

  test('after compaction or /clear there is nothing cold to guard', async ($, on) => {
    const clock = mock.clock(on, { now: START })
    const w = world(on, 'Proceed')
    await $.session.start(session)
    await $.turn.complete(turn())
    await $.session.compact({ trigger: 'manual', messages: [{ role: 'user', text: 'summary', toolUses: [] }] })
    await clock.advance(3 * HOUR)
    await $.prompt.submit(prompt('a'))
    await $.turn.complete(turn())
    await $.classic.SessionStart({ source: 'clear' })
    await clock.advance(3 * HOUR)
    await $.prompt.submit(prompt('b'))
    expect(w.asked).toEqual([])
    expect(w.entered).toEqual(['a', 'b'])
  })

  test('a resumed session that went cold asks before its first send', async ($, on) => {
    mock.clock(on, { now: 10 * HOUR })
    const w = world(on, 'Proceed')
    await $.session.start(session)
    await $.classic.SessionStart({ source: 'resume', context_tokens: 120000, seconds_since_last_response: 2 * 3600 })
    await $.prompt.submit(prompt('hi'))
    expect(w.asked[0]).toMatch(/went cold 1h00m ago\. Sending this re-writes up to 120,000 tokens/)
  })

  test('warns once at session start when cache-tax is also installed', async ($, on) => {
    mock.clock(on, { now: START })
    const w = world(on, 'Proceed', ['cache-tax'])
    await $.session.start(session)
    expect(w.logs).toEqual([expect.stringMatching(/cache-tax is also installed/)])
  })
})
