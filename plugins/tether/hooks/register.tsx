import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentRow, Ask, Assumption, Stats, Undone } from '../types'
import { BACKSTOP_SYSTEM, GUIDANCE, SCHEMA, SEND, TRACK, isDuplicate, looksLikeAsk, parseChange } from './asks'
import type { Change } from './asks'
import { barCells, barSvg, fmt, pillColor, toSnapshot } from './split'

const PANE = 'tether'
// All Mammal palette, the same family as the context bar's colors.
const ACCENT = '#d97757' // terracotta: needs attention
const SOFT = '#e8a58c' // light terracotta: warning
const OLIVE = '#788c5d' // fine, running, done
const SLATE = '#6a9bcc' // information
const STONE = '#b0aea5' // borders only, never text
const INK = '#141413' // text on a filled pill
const NOTE = 'mcp__tether__note_assumption'
const SHOWN_NOTES = 5

// What the model is told, as a section of the system prompt.
const GUIDE = [
  '# Surfacing your assumptions',
  'The user watches a live panel of the assumptions you make about what they want.',
  `Whenever you make a judgment call the user did not state, and it changes what you do next, call the ${NOTE} tool once, before you act on it. If that tool is not loaded yet, load it by its exact name first.`,
  'Log: the scope you settled on, which files or systems you took to be in or out of play, what you chose to keep or delete, a naming or structure choice in a refactor, which of two readings of the request you took, what you took "done" to mean.',
  'Do not log: facts you verified, routine steps, or anything the user said outright.',
  'One plain sentence per assumption. When a later finding overturns an earlier one, call the tool again with `replaces` set to that assumption\'s id.',
  'A small task may have none; a large refactor has many.',
].join('\n')
const MINUTE = 60_000
const MAX_AGENTS = 12

const EMPTY: Stats = {
  openedAt: 0,
  now: 0,
  turns: 0,
  tools: 0,
  fails: 0,
  freshTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  outTokens: 0,
  costUsd: null,
  ctxPercent: null,
  ctxTokens: null,
  ctxWindow: null,
  snapshot: null,
  deferredTokens: 0,
  assumptions: [],
  nextNote: 1,
  agents: [],
  needsMeasure: false,
  undone: [],
  nextUndone: 1,
  lastPrompt: '',
  turnTools: 0,
  isChecking: true,
  tickError: '',
}

const SHOWN_UNDONE = 5
const UNDONE_KEYS = ['a', 'b', 'c', 'd', 'e']
// A turn with fewer tool calls than this did too little work to be checked.
const CHECK_MIN_TOOLS = 5
const CHECKER = 'claude-haiku-4-5-20251001'
const CHECK_SYSTEM = [
  'You read what a user asked a coding assistant to do and the assistant\'s final report, and list the loose ends:',
  'concrete work the assistant could still do itself if the user told it "do it now".',
  'Each loose end is one line under 25 words, starts with a verb, and names the exact thing (file, command, branch, plugin, version, target) so it makes sense to someone who never saw the conversation.',
  'Write "Push branch fix/retry and open a pull request against main", never "Push it".',
  'Leave out: work the report says was skipped on purpose with a reason; decisions or actions only the user can take; headings and list lead-ins such as "What I left alone:"; anything already done; anything you cannot make concrete from the report.',
  'At most three, one per line, no numbering, no commentary. If there are none, reply with the single word NONE.',
  'You may also get the loose ends already open, each with an id such as U3. If the request or the report shows one is done, no longer wanted, or moot, end with one line "RESOLVED: U3 U7". Leave that line out when none are.',
].join(' ')
// ponytail: a loose end open this many main turns is stale and clears itself; tune by feel.
const STALE_TURNS = 10
// How an answer words work it is putting off.
const SAID = /\b(for now|follow[- ]up|out of scope|not yet|I (?:didn't|did not|haven't|have not|skipped|left)\b|(?:do|handle|add|fix|revisit|address|tackle) (?:that|this|it|them|those) later|in a later (?:pass|step|turn|change|PR)|still needs?|remains? to be|placeholder|stubbed|untested|not (?:verified|tested|implemented|wired up))/i
// What put-off work looks like once it is written into a file.
const WROTE = /\b(?:TODO|FIXME|XXX)\b|not implemented|NotImplemented|\bplaceholder\b|\.skip\(|\bx(?:it|describe)\(|@pytest\.mark\.skip/
const WRITERS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']

// The sentences of an answer that put work off, code blocks left out.
const deferrals = (answer: string): string[] =>
  answer
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map(part => part.replace(/^[\s>*#-]+/, '').replace(/\*\*/g, '').trim())
    // Words Claude is quoting or showing as code are not Claude putting work off.
    .filter(part => part.length > 12 && SAID.test(part.replace(/"[^"]*"|`[^`]*`/g, ' ')))
    .map(part => part.slice(0, 200))
    .slice(0, 3)

const recordUndone = async ($: EngineInterface, found: string[], source: Undone['source']): Promise<void> => {
  if (found.length === 0) {
    return
  }

  const at = await $.clock.now()
  let added = 0

  await update($, stats, raw => {
    const s = whole(raw)
    // Cleared and sent ones count too, so a reworded copy doesn't come back.
    const seen = s.undone.map(one => one.text)
    const fresh = found.filter(text => !isDuplicate(text, seen) && (seen.push(text), true))
    added = fresh.length

    return {
      ...s,
      nextUndone: s.nextUndone + fresh.length,
      undone: [
        ...s.undone,
        ...fresh.map((text, i): Undone => ({ id: s.nextUndone + i, text, source, at, turn: s.turns, status: 'open' })),
      ].slice(-40),
    }
  })

  if (added > 0) {
    $.ui.toast(`Loose end: ${(found[0] ?? '').slice(0, 80)}`)
  }
}

// Marks loose ends cleared: by id, or every open one recorded `STALE_TURNS` main turns ago.
const clearUndone = ($: EngineInterface, ids: number[], now?: number) =>
  update($, stats, raw => {
    const s = whole(raw)
    const isStale = (one: Undone) => now !== undefined && now - (one.turn ?? 0) >= STALE_TURNS

    return {
      ...s,
      undone: s.undone.map(one => (one.status === 'open' && (ids.includes(one.id) || isStale(one)) ? { ...one, status: 'cleared' as const } : one)),
    }
  })

// A second, small model reads the request against the final report and writes
// each loose end as a standalone action. It sees the report and not the tool
// calls, so it finds what the report admits to. `hints` are the report's own
// put-off sentences, which alone are too thin to act on. It also gets the open
// loose ends and names the ones the request or report settled, which clear.
const check = async ($: EngineInterface, asked: string, answer: string, hints: string[], source: Undone['source']): Promise<void> => {
  const flagged = hints.length ? `\n\nSENTENCES IN THE REPORT THAT PUT WORK OFF:\n${hints.join('\n')}` : ''
  const open = whole(await read($, stats)).undone.filter(one => one.status === 'open')
  const listed = open.length ? `\n\nLOOSE ENDS ALREADY OPEN:\n${open.map(one => `U${one.id} ${one.text}`).join('\n')}` : ''
  const reply = await $.model.complete({
    model: CHECKER,
    system: CHECK_SYSTEM,
    prompt: `REQUEST:\n${asked || '(not captured)'}\n\nFINAL REPORT:\n${answer.slice(-6000)}${flagged}${listed}`,
    maxTokens: 300,
    timeoutMs: 30_000,
  })

  if (!reply.isAnswered) {
    $.ui.log('tether checker: the model did not answer', { to: 'debug' })

    return
  }

  const rows = reply.text.split('\n').map(row => row.replace(/^[\s\d.*-]+/, '').trim())
  const resolved = rows
    .filter(row => /^resolved:/i.test(row))
    .flatMap(row => [...row.matchAll(/U(\d+)/gi)].map(m => Number(m[1])))
    .filter(id => open.some(one => one.id === id))
  const found = rows
    .filter(row => row !== '' && !/^none\.?$/i.test(row) && !/^resolved:/i.test(row))
    .map(row => row.slice(0, 200))
    .slice(0, 3)

  if (resolved.length > 0) {
    await clearUndone($, resolved)
  }
  await recordUndone($, found, source)
}

const BLANK_ROW: AgentRow = {
  id: '',
  label: '',
  type: 'subagent',
  model: null,
  startedAt: 0,
  endedAt: null,
  lastSeenAt: 0,
  isSpawned: false,
  tools: 0,
  tokensRead: 0,
  tokensOut: 0,
  hasFailed: false,
}

const stats = atom({ plugin: 'tether', key: 'stats' } as const, EMPTY)
// Sections the person folded. Context starts folded: its bar still shows.
const collapsed = atom({ plugin: 'tether', key: 'collapsed' } as const, ['context'])
// What this session is about, in the person's words, and whether its field is open.
const focus = atom({ plugin: 'tether', key: 'focus' } as const, '')
const isEditingFocus = atom({ plugin: 'tether', key: 'isEditingFocus' } as const, false)
// The note follows the session title until the person saves their own; clearing it hands it back.
const isFocusCustom = atom({ plugin: 'tether', key: 'isFocusCustom' } as const, false)
// Open asks: the list, the next id, and the texts of the last 20 answered or resolved asks,
// so the backstop never re-adds one.
const asks = atom({ plugin: 'tether', key: 'asks' } as const, [])
const nextAsk = atom({ plugin: 'tether', key: 'nextAsk' } as const, 1)
const closedAsks = atom({ plugin: 'tether', key: 'closedAsks' } as const, [])

// The session's stored value may predate a field added since: fill the gaps.
const whole = (s: Stats): Stats => ({
  ...EMPTY,
  ...s,
  agents: (s.agents ?? []).map(row => ({ ...BLANK_ROW, ...row })),
})

const compact = (n: number): string => {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`
  }

  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`
}

const elapsed = (ms: number): string => {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const mm = `${Math.floor(seconds / 60)}`.padStart(2, '0')

  return `${mm}:${`${seconds % 60}`.padStart(2, '0')}`
}

const money = (usd: number | null): string => {
  if (usd === null) {
    return '--'
  }

  return usd > 0 && usd < 0.005 ? '<$0.01' : `$${usd.toFixed(2)}`
}

// A running subagent's clock in whole minutes, so the timer redraws the pane once a minute
// rather than every second; a finished one keeps mm:ss.
const took = (row: AgentRow, runs: boolean, now: number): string =>
  runs ? `${Math.floor((now - row.startedAt) / MINUTE)}m` : elapsed((row.endedAt ?? row.lastSeenAt) - row.startedAt)

const tokensRead = (s: Stats): number => s.freshTokens + s.cacheReadTokens + s.cacheWriteTokens

// A row nobody spawned in view of this mod (a fork of the engine's, an agent
// older than this load) may never report an end, so silence ends it.
const isRunning = (row: AgentRow, now: number): boolean =>
  row.endedAt === null && (row.isSpawned || now - row.lastSeenAt < 2 * MINUTE)

// What the timer moves on screen: each running subagent's minutes, and whether it still runs.
const face = (s: Stats): string =>
  JSON.stringify(s.agents.map(row => (isRunning(row, s.now) ? Math.floor((s.now - row.startedAt) / MINUTE) : -1)))

const withAgent = (agents: AgentRow[], id: string, at: number, change: (row: AgentRow) => AgentRow): AgentRow[] => {
  const known = agents.find(row => row.id === id) ?? {
    ...BLANK_ROW,
    id,
    label: `agent ${id.slice(0, 6)}`,
    startedAt: at,
  }
  const rows = [...agents.filter(row => row.id !== id), { ...change(known), lastSeenAt: at }]
  // Over the cap, the oldest finished rows go; a running one never does.
  const surplus = rows.filter(row => row.endedAt !== null).slice(0, Math.max(0, rows.length - MAX_AGENTS))

  return rows.filter(row => !surplus.includes(row))
}

const measure = async ($: EngineInterface): Promise<void> => {
  const { context, cost } = await $.session.usage({ breakdown: 'summary' })
  const breakdown = context.breakdown
  const snapshot = breakdown === undefined ? null : toSnapshot(breakdown, await $.session.messages({ as: 'api' }))
  const deferredTokens = (breakdown?.categories ?? []).filter(row => row.kind === 'deferred').reduce((sum, row) => sum + row.tokens, 0)

  // The breakdown measures against the window compaction works to, which is
  // what its rows add up to; a window just compacted has no reading of its
  // own until its next response, so nothing older is carried over it.
  await update($, stats, raw => ({
    ...whole(raw),
    costUsd: cost?.usd ?? raw.costUsd,
    ctxPercent: breakdown?.percentage ?? context.percent ?? null,
    ctxTokens: context.tokens ?? breakdown?.totalTokens ?? null,
    ctxWindow: breakdown?.rawMaxTokens ?? context.window,
    snapshot,
    deferredTokens,
    needsMeasure: false,
  }))
}

// The model's own report of an assumption: stored, shown at once, and
// answered with the id a later note names to replace it.
const recordAssumption = async ($: EngineInterface, input: Record<string, unknown>, agentId: string | undefined): Promise<string | null> => {
  const say = (key: string): string => `${input[key] ?? ''}`.replace(/\s+/g, ' ').trim().slice(0, 240)
  const text = say('assumption')

  if (text === '') {
    return null
  }

  const at = await $.clock.now()
  const replaces = Number(say('replaces').replace(/\D/g, '')) || null
  let id = 0

  await update($, stats, raw => {
    const s = whole(raw)
    id = s.nextNote
    const added: Assumption = {
      id,
      text,
      basis: say('basis'),
      affects: say('affects'),
      at,
      agent: agentId ?? null,
      status: 'open',
      replacedBy: null,
    }

    return {
      ...s,
      openedAt: s.openedAt || at,
      now: at,
      nextNote: id + 1,
      assumptions: [
        ...s.assumptions.map(one =>
          one.id === replaces && one.status === 'open' ? { ...one, status: 'replaced' as const, replacedBy: id } : one,
        ),
        added,
      ].slice(-30),
    }
  })

  $.ui.toast(`Assumed: ${text.slice(0, 90)}`)

  return `Noted as A${id}. The user can see it.`
}

// Only the settings-hook events carry the session title. It is generated after the first
// prompt, so it arrives with the second one; a sidebar rename arrives with the next.
const followTitle = async ($: EngineInterface, title: string | undefined): Promise<void> => {
  const t = title?.trim().slice(0, 500) ?? ''
  if (t !== '' && !(await read($, isFocusCustom)) && (await read($, focus)) !== t) {
    await update($, focus, () => t)
  }
}

const rememberAsks = ($: EngineInterface, texts: string[]) =>
  texts.length ? update($, closedAsks, l => [...l, ...texts].slice(-20)) : Promise.resolve([])

const applyAsks = async ($: EngineInterface, change: Change): Promise<void> => {
  const added: Ask[] = []
  for (const item of change.add) {
    let id = 0
    await update($, nextAsk, n => ((id = n), n + 1))
    added.push({ ...item, id })
  }
  const gone = new Set(change.resolve)
  const before = await read($, asks)
  await update($, asks, l => [...l.filter(a => !gone.has(a.id)), ...added])
  await rememberAsks($, before.filter(a => gone.has(a.id)).map(a => a.text))
  if (added.length) {
    $.ui.toast(`Waiting on you: ${(added[0]?.text ?? '').slice(0, 80)}`)
  }
}

// A sent prompt that holds a button's drafted reply answers that ask: drop it now
// rather than wait for Claude to resolve it with `track`.
const settleDrafted = async ($: EngineInterface, sent: string): Promise<void> => {
  const answered = (await read($, asks)).filter(a => a.drafted !== undefined && sent.includes(a.drafted))
  if (answered.length === 0) {
    return
  }
  const gone = new Set(answered.map(a => a.id))
  await update($, asks, l => l.filter(a => !gone.has(a.id)))
  await rememberAsks($, answered.map(a => a.text))
}

// The backstop: when Claude's reply looks like it asks something and it never called
// `track`, Haiku reads the reply and adds what it missed.
const extractAsks = async ($: EngineInterface, prompt: string, answer: string): Promise<void> => {
  const list = await read($, asks)
  const done = await read($, closedAsks)
  const r = await $.model.complete({
    model: 'haiku',
    system: BACKSTOP_SYSTEM,
    prompt: `Open list:\n${list.map(a => `#${a.id} [${a.kind}] ${a.text}`).join('\n') || '(empty)'}\n\nRecently closed (never re-add):\n${done.join('\n') || '(none)'}\n\nUser's last message:\n${prompt.slice(-4000)}\n\nAssistant's reply:\n${answer.slice(-12000)}`,
    maxTokens: 800,
    effort: 'low',
  })
  if (!r.isAnswered) {
    return
  }
  // Haiku re-adds reworded copies of open and just-answered asks; drop them here rather than trust the prompt.
  const change = parseChange(r.text)
  const seen = [...list.map(a => a.text), ...done]
  await applyAsks($, { ...change, add: change.add.filter(a => !isDuplicate(a.text, seen) && (seen.push(a.text), true)) })
}

export const register: Register = on => {
  // The module's own: a reload forgets it, which costs at most one backstop run.
  let isTracked = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tether',
      description: 'Open the session dashboard pane',
    })

    // Opens itself on every session start. Unasked, a terminal places it from 144 columns;
    // narrower, it waits until the terminal widens or /tether opens it.
    $.ui.open({ id: PANE, title: 'Tether' }).catch((err: unknown) => $.ui.log(`tether open: ${String(err)}`, { to: 'debug' }))

    const tick = async (): Promise<void> => {
      const s = whole(await read($, stats))
      const at = await $.clock.now()

      // A compaction left the context reading to be taken again.
      if (s.needsMeasure) {
        await measure($)
      }

      // Written only when a figure on screen would change, so the band and pane
      // redraw about once a minute instead of every second.
      if (s.tickError !== '' || face(s) !== face({ ...s, now: at })) {
        await update($, stats, one => ({ ...whole(one), tickError: '', now: at }))
      }
    }
    const failed = (where: string) => async (err: unknown): Promise<void> => {
      $.ui.log(`tether ${where}: ${String(err)}`, { to: 'debug' })
      await update($, stats, one => ({ ...whole(one), tickError: `${where}: ${String(err)}`.slice(0, 120) }))
    }

    // Started before anything that could fail, so the clock always runs.
    $.clock.every(1000, () => {
      tick().catch(failed('timer'))
    })

    await $.tool.register({
      name: 'note_assumption',
      description:
        'Record one assumption you are making about what the user wants, before acting on it. The user sees it at once and can reject it. Use it for judgment calls the user did not state; not for verified facts or routine steps.',
      inputSchema: {
        type: 'object',
        properties: {
          assumption: { type: 'string', description: 'The assumption, as one plain sentence.' },
          basis: { type: 'string', description: 'What led you to it, in a few words.' },
          affects: { type: 'string', description: 'What it changes: the files, behaviour or scope that would differ if it is wrong.' },
          replaces: { type: 'string', description: 'The id of an earlier assumption this one overturns, such as A3. Leave out otherwise.' },
        },
        required: ['assumption', 'basis', 'affects'],
        additionalProperties: false,
      },
    })

    await $.tool.register({
      name: 'track',
      description: "Add or resolve items in the user's Action items panel: what you are waiting on the user for.",
      inputSchema: SCHEMA,
    })

    return next(e)
  })

  on('command.run', { command: 'tether' }, async ($, e) => {
    const word = `${e.args ?? ''}`.trim().toLowerCase()

    if (word === 'check on' || word === 'check off') {
      await update($, stats, s => ({ ...whole(s), isChecking: word === 'check on' }))

      return { text: `Second-model check of finished turns is ${word.slice(6)}.` }
    }

    await $.ui.open({ id: PANE, title: 'Tether' })
    await measure($)

    return { text: 'Session dashboard opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)

    if (spawned.agentId !== undefined) {
      const id = spawned.agentId
      const at = await $.clock.now()
      await update($, stats, raw => ({
        ...whole(raw),
        now: at,
        agents: withAgent(whole(raw).agents, id, at, row => ({
          ...row,
          label: e.description,
          type: e.subagentType,
          model: spawned.model,
          isSpawned: true,
        })),
      }))
    }

    return spawned
  })

  // What the person asked for, kept for the check at the end of the turn.
  on('prompt.submit', async ($, e, next) => {
    const kind: string = e.origin.kind

    if (kind === 'composer' || kind === 'bridge' || kind === 'sdk') {
      await update($, stats, raw => ({ ...whole(raw), lastPrompt: e.text.slice(0, 4000) }))
      await settleDrafted($, e.text)
    }

    return next(e)
  })

  on('classic.SessionStart', async ($, e, next) => {
    await followTitle($, e.session_title)
    return next(e)
  })
  on('classic.UserPromptSubmit', async ($, e, next) => {
    await followTitle($, e.session_title)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    isTracked = false

    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return {
      sections: [...composed.sections, { id: 'tether:assumptions', text: GUIDE, scope: 'session' as const }, { id: 'tether:asks', text: GUIDANCE, scope: 'session' as const }],
    }
  })

  // Each request of a loop. A subagent's request means it is at work, even
  // one that had finished an earlier run.
  on('turn.step', async function* ($, e, next) {
    const at = await $.clock.now()
    const agentId = e.agentId

    await update($, stats, raw => {
      const s = whole(raw)

      return agentId === undefined
        ? { ...s, now: at }
        : { ...s, now: at, agents: withAgent(s.agents, agentId, at, row => ({ ...row, endedAt: null })) }
    })

    return yield* next(e)
  })

  on('tool.call', async ($, e, next) => {
    // The mod's own tool is answered here and is not counted as a tool call.
    const called: string = e.tool
    const calledBy = e.agentId

    if (called === TRACK) {
      isTracked = true
      // The tool's arguments sit on e itself, beside tool and tool_use_id.
      await applyAsks($, parseChange(JSON.stringify(e)))
      const open = (await read($, asks)).map(a => `#${a.id} [${a.kind}] ${a.text}`)
      const text = open.length ? `Action items:\n${open.join('\n')}` : 'No action items.'

      return { result: text, text } as never
    }

    if (called === NOTE) {
      const noted = await recordAssumption($, e as unknown as Record<string, unknown>, calledBy)

      return (noted === null
        ? { deny: 'note_assumption needs an `assumption`: one plain sentence.' }
        : { result: noted }) as never
    }

    const ran = await next(e)

    const at = await $.clock.now()
    const agentId = e.agentId
    const hasFailed = ran.deny !== undefined || ran.isError === true

    await update($, stats, raw => {
      const s = whole(raw)

      return {
        ...s,
        openedAt: s.openedAt || at,
        now: at,
        tools: s.tools + 1,
        fails: s.fails + (hasFailed ? 1 : 0),
        turnTools: s.turnTools + (agentId === undefined ? 1 : 0),
        agents: agentId === undefined
          ? s.agents
          : withAgent(s.agents, agentId, at, row => ({ ...row, endedAt: null, tools: row.tools + 1 })),
      }
    })

    // Put-off work written into a file: the line that says so, and where.
    if (!hasFailed && WRITERS.includes(called)) {
      const input = e as unknown as Record<string, unknown>
      const wrote = `${input.new_string ?? input.content ?? input.new_source ?? ''}`
      const row = wrote.split('\n').find(one => WROTE.test(one))

      if (row !== undefined) {
        const file = `${input.file_path ?? input.notebook_path ?? 'a file'}`.split(/[\\/]/).pop() ?? 'a file'
        await recordUndone($, [`Finish "${row.trim().slice(0, 90)}" in ${file}`], 'code')
      }
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const at = await $.clock.now()
    const agentId = e.agentId
    const out = e.usage?.output_tokens ?? 0
    // `input_tokens` is the uncached part alone; a cached prompt reports
    // nearly all of its input under the two cache fields.
    const fresh = e.usage?.input_tokens ?? 0
    const cacheRead = e.usage?.cache_read_input_tokens ?? 0
    const cacheWrite = e.usage?.cache_creation_input_tokens ?? 0

    await update($, stats, raw => {
      const s = whole(raw)

      return {
        ...s,
        openedAt: s.openedAt || at,
        now: at,
        turns: s.turns + (agentId === undefined ? 1 : 0),
        freshTokens: s.freshTokens + fresh,
        cacheReadTokens: s.cacheReadTokens + cacheRead,
        cacheWriteTokens: s.cacheWriteTokens + cacheWrite,
        outTokens: s.outTokens + out,
        agents: agentId === undefined
          ? s.agents
          : withAgent(s.agents, agentId, at, row => ({
              ...row,
              endedAt: at,
              model: e.usage?.model ?? row.model,
              tokensRead: row.tokensRead + fresh + cacheRead + cacheWrite,
              tokensOut: row.tokensOut + out,
              hasFailed: e.reason === 'error' || e.reason === 'aborted',
            })),
      }
    })

    if (agentId === undefined) {
      await measure($)

      await clearUndone($, [], whole(await read($, stats)).turns)
      const turn = whole(await read($, stats))
      await update($, stats, raw => ({ ...whole(raw), turnTools: 0 }))

      if (e.reason === 'answer') {
        const hints = deferrals(e.answer)
        const hasOpen = turn.undone.some(one => one.status === 'open')

        if (!isTracked && looksLikeAsk(e.answer)) {
          // Not awaited: off the turn's path.
          extractAsks($, turn.lastPrompt, e.answer).catch((err: unknown) =>
            $.ui.log(`tether asks backstop: ${String(err)}`, { to: 'debug' }),
          )
        }

        // A put-off sentence alone ("I haven't deployed it.") is too thin to act on,
        // so it goes through the checker to come back as a concrete action, or not at all.
        // While any loose end is open the checker runs every turn, to clear the ones now settled.
        if (turn.isChecking && (hints.length > 0 || hasOpen || (turn.turnTools >= CHECK_MIN_TOOLS && turn.lastPrompt !== ''))) {
          // Not awaited: the turn ends now and the finding arrives when it does.
          check($, turn.lastPrompt, e.answer, hints, hints.length > 0 ? 'said' : 'checker').catch((err: unknown) =>
            $.ui.log(`tether checker: ${String(err)}`, { to: 'debug' }),
          )
        }
      }
    }

    return next(e)
  })

  // A compacted main conversation is a different window: measure it again
  // rather than leave the figures of the one it replaced.
  on('session.compact', async ($, e, next) => {
    const done = await next(e)

    if (e.agentId !== undefined || e.trigger === 'precompute' || done.messages === undefined) {
      return done
    }

    // The engine swaps the conversation in after this hook returns, so a
    // reading taken here is still the old one: show the compaction's own
    // count now and measure again on the next tick.
    const { tokensBefore, tokensAfter } = done

    await update($, stats, raw => {
      const s = whole(raw)
      const sized = tokensAfter !== undefined && s.ctxWindow !== null && s.ctxWindow > 0

      return {
        ...s,
        needsMeasure: true,
        ctxTokens: tokensAfter ?? s.ctxTokens,
        ctxPercent: sized ? (tokensAfter / (s.ctxWindow ?? 1)) * 100 : s.ctxPercent,
        snapshot: sized ? null : s.snapshot,
      }
    })

    if (tokensBefore !== undefined && tokensAfter !== undefined) {
      $.ui.toast(`Compacted: ${compact(tokensBefore)} to ${compact(tokensAfter)} tokens`)
    }

    return done
  })


  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    // Mobile draws no text field; there the note shows but can't be edited.
    const Input = 'Input' in ui ? ui.Input : undefined
    // The terminal has no Svg; it gets the text bar.
    const Svg = e.surface === 'desktop' ? $.ui.resolve(e).Svg : undefined
    const s = whole(await read($, stats))
    const folded = await read($, collapsed)
    const waiting = await read($, asks)
    const inner = Math.max(16, e.props.bodyColumns - 4)
    const viewedId = e.props.view?.agentId

    const line = (label: string, value: string, color?: string) => (
      <Box flexDirection="row" justifyContent="space-between">
        <Text dimColor>{label}</Text>
        <Text color={color} bold>{value}</Text>
      </Box>
    )
    const fold = (id: string) => update($, collapsed, list => (list.includes(id) ? list.filter(one => one !== id) : [...list, id]))
    // One card per section, styled like the context card. The header toggles
    // the body; `always` stays in view while it is folded.
    const section = (id: string, label: string, summary: JSX.Element | string, body: JSX.Element[], always?: JSX.Element) => {
      const isOpen = !folded.includes(id)

      return (
        <Box key={`p-${id}`} flexDirection="column" borderStyle="round" borderColor={STONE} borderDimColor paddingX={1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Box flexDirection="row">
              <Text color={ACCENT}>{'◆ '}</Text>
              <Button key={`fold-${id}`} plain label={`${label} ${isOpen ? '▾' : '▸'}`} onPress={() => fold(id)} />
            </Box>
            {typeof summary === 'string' ? <Text dimColor>{summary}</Text> : summary}
          </Box>
          {always}
          {isOpen && <Box flexDirection="column">{body}</Box>}
        </Box>
      )
    }
    const draft = (text: string) => $.prompt.fill({ text, mode: 'append' })
    // Approve clears an assumption from the panel; nothing is sent.
    const clearNote = (id: number) => update($, stats, raw => ({
      ...whole(raw),
      assumptions: whole(raw).assumptions.map(one => (one.id === id ? { ...one, status: 'cleared' as const } : one)),
    }))
    // "Reject" puts the correction in the prompt box for the person to finish
    // and send; nothing reaches the model until they do.
    const flag = async (id: number, text: string): Promise<void> => {
      await draft(`Assumption A${id} is wrong ("${text}"). Instead: \n\n`)
      await update($, stats, raw => ({
        ...whole(raw),
        assumptions: whole(raw).assumptions.map(one => (one.id === id ? { ...one, status: 'flagged' as const } : one)),
      }))
    }
    // "Do now" drafts the instruction; the person sends it.
    const push = async (id: number, text: string): Promise<void> => {
      await draft(`You left this undone: "${text}". Do it now.\n\n`)
      await update($, stats, raw => ({
        ...whole(raw),
        undone: whole(raw).undone.map(one => (one.id === id ? { ...one, status: 'sent' as const } : one)),
      }))
    }
    const clear = (id?: number) => update($, stats, raw => ({
      ...whole(raw),
      undone: whole(raw).undone.map(one => (one.status === 'open' && (id === undefined || one.id === id) ? { ...one, status: 'cleared' as const } : one)),
    }))
    const todo = s.undone.filter(one => one.status === 'open').slice(-SHOWN_UNDONE).reverse()
    const sources = { said: 'Claude said', code: 'in a file', checker: 'second model' }
    const notes = (list: Assumption[]) => list.filter(one => one.status !== 'cleared').slice(-SHOWN_NOTES).reverse().map((note, i) => {
      const isOpen = note.status === 'open'
      const who = note.agent === null ? '' : ` · ${s.agents.find(row => row.id === note.agent)?.label ?? 'subagent'}`

      return (
        <Box key={`note-${note.id}`} flexDirection="column" marginTop={i === 0 ? 0 : 1}>
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={isOpen ? SLATE : undefined} dimColor={!isOpen} bold>{`A${note.id} · ${elapsed(note.at - s.openedAt)}${who}`.slice(0, Math.max(8, inner - 24))}</Text>
            <Box flexDirection="row" columnGap={1}>
              {!isOpen && <Text color={note.status === 'flagged' ? ACCENT : undefined} dimColor={note.status !== 'flagged'}>{note.status === 'flagged' ? 'you flagged it' : `replaced by A${note.replacedBy ?? '?'}`}</Text>}
              <Button key={`ok-${note.id}`} label={isOpen ? 'Approve' : 'Clear'} onPress={() => clearNote(note.id)} />
              {isOpen && <Button key={`wrong-${note.id}`} label={`${i + 1} Reject`} hotkey={`${i + 1}`} onPress={() => flag(note.id, note.text)} />}
            </Box>
          </Box>
          <Text dimColor={!isOpen} strikethrough={note.status === 'replaced'} wrap="wrap">{note.text}</Text>
          {isOpen && note.basis !== '' && <Text dimColor wrap="wrap">{`because ${note.basis}`}</Text>}
          {isOpen && note.affects !== '' && <Text dimColor wrap="wrap">{`affects ${note.affects}`}</Text>}
        </Box>
      )
    })
    const agentRows = (limit: number) => [...s.agents].sort((a, b) => b.startedAt - a.startedAt).slice(0, limit).map(row => {
      const runs = isRunning(row, s.now)
      const color = runs ? OLIVE : row.hasFailed ? ACCENT : SLATE
      const pointer = row.id === viewedId ? '▶ ' : ''

      return (
        <Box flexDirection="column">
          <Box flexDirection="row" justifyContent="space-between">
            <Text color={color} bold>{`${pointer}${runs ? '●' : row.hasFailed ? '✗' : '✓'} ${row.label}`.slice(0, Math.max(8, inner - 7))}</Text>
            <Text color={color}>{took(row, runs, s.now)}</Text>
          </Box>
          <Text dimColor>
            {`  ${runs ? 'running' : row.hasFailed ? 'stopped' : 'done'} · ${row.type} · ${row.model ?? 'model unknown'} · ${row.tools} tool calls`.slice(0, inner)}
          </Text>
        </Box>
      )
    })
    const shownNotes = (list: Assumption[]) => list.filter(one => one.status === 'open').length

    // A subagent's transcript is on screen: the pane is that agent's.
    if (viewedId !== undefined) {
      const row = s.agents.find(one => one.id === viewedId)
      const runs = row !== undefined && isRunning(row, s.now)
      const color = row === undefined ? SOFT : runs ? OLIVE : row.hasFailed ? ACCENT : SLATE
      const own = s.assumptions.filter(note => note.agent === viewedId)

      return (
        <Box flexDirection="column">
          {section('agent', 'subagent in view', runs ? 'running' : '', row === undefined
            ? [<Text color={color} bold>{`agent ${viewedId.slice(0, 6)}`}</Text>, <Text dimColor>No activity seen yet</Text>]
            : [
                <Text color={color} bold>{row.label.slice(0, inner)}</Text>,
                line('Status', runs ? 'running' : row.hasFailed ? 'stopped' : 'done', color),
                line('Time', took(row, runs, s.now), color),
                line('Type', row.type),
                line('Model', row.model ?? 'unknown'),
                line('Tool calls', `${row.tools}`),
                line('Tokens read', compact(row.tokensRead)),
                line('Tokens written', compact(row.tokensOut)),
                <Text dimColor>Tokens update each time it finishes a run</Text>,
              ])}
          {section('assumptions', 'assumptions', `${shownNotes(own)} open`, [
            ...(own.length === 0 ? [<Text dimColor>None reported yet</Text>] : []),
            ...notes(own),
          ])}
          {section('agents', 'all subagents', `${s.agents.length}`, agentRows(6))}
          <Text dimColor>Context and cache belong to the main session. Switch back to see them.</Text>
        </Box>
      )
    }

    // Open asks: each button drafts its reply into the prompt box, and the ask clears when
    // that reply is sent. A finished reply ends in a blank line, so several pressed in a row
    // stack as paragraphs. Discuss and Answer leave the cursor after their colon for typing,
    // and start a conversation, so Discuss's ask stays until Claude resolves it with `track`.
    // Dismiss drops it unsent.
    const dismissAsk = async (a: Ask): Promise<void> => {
      await update($, asks, l => l.filter(x => x.id !== a.id))
      await rememberAsks($, [a.text])
    }
    // Clear all drops every ask unsent, for a list gone stale; remembered so the backstop doesn't re-add them.
    const clearAsks = async (): Promise<void> => {
      const all = await read($, asks)
      await update($, asks, () => [])
      await rememberAsks($, all.map(a => a.text))
    }
    const askButtons = (a: Ask) => {
      const b = (name: string, label: string, text: string) => (
        <Button
          key={`${name}${a.id}`}
          label={label}
          onPress={async () => {
            await draft(text.endsWith(': ') ? text : `${text}\n\n`)
            await update($, asks, l => l.map(x => (x.id === a.id ? { ...x, drafted: text.trim() } : x)))
          }}
        />
      )
      const discuss = <Button key={`discuss${a.id}`} label="Discuss" onPress={() => draft(SEND.discuss(a))} />
      switch (a.kind) {
        case 'decision':
          return [b('approve', 'Approve', SEND.approve(a)), b('deny', 'Deny', SEND.deny(a)), discuss]
        case 'choice':
          return [...(a.options ?? []).map((o, i) => b(`pick${i}-`, o, SEND.pick(a, o))), discuss]
        case 'question':
          return [b('answer', 'Answer', SEND.answer(a)), discuss, <Button key={`dismiss${a.id}`} label="Dismiss" onPress={() => dismissAsk(a)} />]
        case 'review':
          return [b('good', 'Looks good', SEND.good(a)), discuss]
        case 'todo':
          return [b('done', 'Done', SEND.done(a)), b('cancel', 'Cancel', SEND.cancel(a)), discuss]
      }
    }

    const snap = s.snapshot
    const legend = snap === null
      ? []
      : [...snap.slices.filter(x => x.label !== 'free').sort((a, b) => b.tokens - a.tokens), ...snap.slices.filter(x => x.label === 'free')]
    const bar = snap === null
      ? <Text dimColor>Measured after the next turn</Text>
      : Svg
        ? <Svg source={barSvg(snap)} alt={`context ${snap.percent}% full`} height={10} isInteractive />
        : <Text>{barCells(snap, inner).map((run, i) => <Text key={`b${i}`} color={run.color}>{run.text}</Text>)}</Text>
    const ctxSummary = snap === null
      ? ''
      : (
          <Text>
            <Text bold>{fmt(snap.used)}</Text>
            <Text dimColor>{` of ${fmt(snap.window)}  `}</Text>
            <Text bold color={INK} backgroundColor={pillColor(snap.percent)}>{` ${snap.percent}% `}</Text>
          </Text>
        )
    const read_ = tokensRead(s)
    const cached = read_ === 0 ? 0 : Math.round((s.cacheReadTokens / read_) * 100)

    const note = await read($, focus)
    const isEditing = (await read($, isEditingFocus)) || note === ''
    const saveFocus = async (value: string): Promise<void> => {
      await update($, focus, () => value.trim().slice(0, 500))
      await update($, isFocusCustom, () => value.trim() !== '')
      await update($, isEditingFocus, () => false)
    }

    return (
      <Box flexDirection="column">
        {section('focus', 'working on', '', [
          ...(isEditing && Input
            ? [
                <Box key="focus-field" width="100%">
                  <Input key="focus-input" placeholder="What are we working on? Enter to save" value={note} submitLabel="save" onSubmit={(v: string) => saveFocus(v)} />
                </Box>,
              ]
            : [
                <Box key="focus-row" flexDirection="row" justifyContent="space-between">
                  <Text wrap="wrap">{note === '' ? 'Nothing noted.' : note}</Text>
                  {Input && <Button key="focus-edit" label="Edit" onPress={() => update($, isEditingFocus, () => true)} />}
                </Box>,
              ]),
        ])}
        {section('context', 'context', ctxSummary, [
          ...legend.map(sl => (
            <Box key={`leg-${sl.label}`} flexDirection="row" justifyContent="space-between">
              <Text wrap="truncate">
                <Text color={sl.color}>{'■ '}</Text>
                <Text>{sl.label}</Text>
                {sl.note ? <Text dimColor>{` · ${sl.note}`}</Text> : null}
              </Text>
              <Text>
                <Text bold>{fmt(sl.tokens)}</Text>
                {sl.label === 'free' ? null : <Text dimColor>{` ${sl.percent}%`.padStart(5)}</Text>}
              </Text>
            </Box>
          )),
          ...(s.deferredTokens > 0 ? [<Text dimColor>{`+ ${compact(s.deferredTokens)} of tools loaded only when needed`}</Text>] : []),
        ], bar)}
        {section('assumptions', 'assumptions', `${shownNotes(s.assumptions)} open`, [
          ...(s.assumptions.every(one => one.status === 'cleared')
            ? [<Text dimColor>None open. They appear here as Claude makes them.</Text>]
            : []),
          ...notes(s.assumptions),
        ])}
        {section('undone', 'loose ends', todo.length === 0 ? '' : `${todo.length} open`, [
          ...(todo.length === 0 ? [<Text dimColor>Nothing flagged. Work Claude puts off shows up here.</Text>] : []),
          ...todo.map((one, i) => (
            <Box key={`undone-${one.id}`} flexDirection="column" marginTop={i === 0 ? 0 : 1}>
              <Box flexDirection="row" justifyContent="space-between">
                <Text color={ACCENT} bold>{`U${one.id} · ${elapsed(one.at - s.openedAt)} · ${sources[one.source]}`.slice(0, Math.max(8, inner - 22))}</Text>
                <Box flexDirection="row" columnGap={1}>
                  <Button key={`do-${one.id}`} label={`${UNDONE_KEYS[i] ?? ''} Do now`} hotkey={UNDONE_KEYS[i] ?? 'a'} onPress={() => push(one.id, one.text)} />
                  <Button key={`clear-${one.id}`} label="Clear" onPress={() => clear(one.id)} />
                </Box>
              </Box>
              <Text wrap="wrap">{one.text}</Text>
            </Box>
          )),
          ...(todo.length > 0 ? [<Button key="undone-clear" label="x Clear all" hotkey="x" onPress={() => clear()} />] : []),
        ])}
        {section('asks', 'action items', waiting.length === 0 ? '' : `${waiting.length} waiting`, waiting.length === 0
          ? [<Text dimColor>Nothing waiting on you.</Text>]
          : [
              ...waiting.map((a, i) => (
                <Box key={`ask-${a.id}`} flexDirection="column" marginTop={i === 0 ? 0 : 1}>
                  <Text wrap="wrap">{a.text}</Text>
                  {a.drafted !== undefined && <Text dimColor>In your prompt box. Clears when you send it.</Text>}
                  <Box columnGap={1} rowGap={1} flexWrap="wrap">{askButtons(a)}</Box>
                </Box>
              )),
              <Box key="asks-clear-row" marginTop={1}><Button key="asks-clear" label="Clear all" onPress={clearAsks} /></Box>,
            ])}
        {section('agents', 'subagents', `${s.agents.filter(row => isRunning(row, s.now)).length} running`, [
          ...(s.agents.length === 0 ? [<Text dimColor>None started yet</Text>] : []),
          ...agentRows(6),
        ])}
        {section('cost', 'cost and tokens', money(s.costUsd), [
          line('Cost, whole session', money(s.costUsd)),
          line('Tokens read', compact(read_)),
          line('  served from cache', `${cached}%`, SLATE),
          line('Tokens written', compact(s.outTokens)),
          line('Turns', `${s.turns}`),
          <Text dimColor>Tokens and turns count from when this loaded</Text>,
          ...(s.tickError !== '' ? [<Text key="p-timer" color={ACCENT}>{`Timer error, ${s.tickError}`}</Text>] : []),
        ])}
      </Box>
    )
  })
}
