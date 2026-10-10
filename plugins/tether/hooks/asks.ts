// Action items: what Claude is waiting on the person for. Brought in from the open-asks plugin,
// which the desk replaces; run one or the other, since both register a `track` tool.
import type { Ask, AskKind } from '../types'

export const TRACK = 'mcp__tether__track'
export const KINDS: AskKind[] = ['decision', 'choice', 'question', 'review', 'todo']

export const GUIDANCE = `Action items: the user keeps a panel of everything you are waiting on them for. Whenever your reply asks the user to decide, choose, answer, check something, or do something themselves, call ${TRACK} in the same turn with "add" (kinds: decision = yes/no before you act, naming the exact action; choice = 2-4 short "options"; question = information only they have; review = look at something and report back; todo = they act outside the chat). One standalone line per item that makes sense without the transcript. The panel empties every time the user sends a message, so each reply adds everything it still waits on, including an earlier ask that is still unanswered. When your work in this turn makes an item you added moot, pass its id in "resolve". The tool returns the open list with ids.`

export const SCHEMA = {
  type: 'object',
  properties: {
    add: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: KINDS },
          text: { type: 'string', description: 'One standalone line.' },
          options: { type: 'array', items: { type: 'string' }, description: 'choice only: 2-4 short labels.' },
        },
        required: ['kind', 'text'],
      },
    },
    resolve: { type: 'array', items: { type: 'number' }, description: 'Ids of answered or moot items.' },
  },
}

export const BACKSTOP_SYSTEM = `You track what an AI coding assistant is waiting on its user for. You get the open list, the user's last message, and the assistant's reply. Answer with JSON only: {"add":[{"kind":"...","text":"...","options":["..."]}],"resolve":[ids]}.
Kinds:
- decision: a yes/no the assistant wants before acting ("Delete the remote branch?"). Text names the exact action.
- choice: pick one of 2-4 named options; put them in "options", short labels.
- question: needs information only the user has, answered in words.
- review: the user should look at something (a page, a pane, a PR) and report whether it is right.
- todo: something the user must do themselves outside the chat (run a command, change an admin setting, message someone).
add: each such thing in the reply. One standalone line each that makes sense without the transcript. Skip anything already on the open list, anything the user's message already answered, rhetorical questions, and things the assistant will do itself.
resolve: ids of open items the user's message answered or the reply settled or made moot.
Nothing to change: {"add":[],"resolve":[]}.`

// What each button drafts into the prompt box. Sending any message clears the list, so none of these needs tracking.
// rekall/graph-memory/recall_hook.py BUTTON_PROMPT matches these shapes to skip recall; change both together.
const quote = (a: Ask) => `"${a.text}"`
export const SEND = {
  approve: (a: Ask) => `Approved: ${a.text}`,
  deny: (a: Ask) => `Denied: ${a.text}`,
  pick: (a: Ask, opt: string) => `For ${quote(a)}, I pick: ${opt}`,
  good: (a: Ask) => `Checked, looks good: ${a.text}`,
  done: (a: Ask) => `Done: ${a.text}`,
  cancel: (a: Ask) => `Not doing this, plan around it: ${a.text}`,
  answer: (a: Ask) => `Answer to ${quote(a)}: `,
  discuss: (a: Ask) => `Let's discuss ${quote(a)}: `,
}

export type Change = { add: Omit<Ask, 'id'>[]; resolve: number[] }

// ponytail: tolerant parse of the model's JSON; a bad reply changes nothing
export function parseChange(reply: string): Change {
  try {
    const raw = JSON.parse(reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1))
    const add: Omit<Ask, 'id'>[] = []
    for (const a of Array.isArray(raw.add) ? raw.add : []) {
      if (!KINDS.includes(a?.kind) || typeof a.text !== 'string' || !a.text.trim()) continue
      const options = Array.isArray(a.options) ? a.options.filter((o: unknown) => typeof o === 'string' && o.trim()).slice(0, 4) : []
      if (a.kind === 'choice' && options.length < 2) add.push({ kind: 'question', text: a.text.trim() })
      else add.push({ kind: a.kind, text: a.text.trim(), ...(a.kind === 'choice' ? { options } : {}) })
    }
    const resolve = (Array.isArray(raw.resolve) ? raw.resolve : []).filter((n: unknown) => typeof n === 'number')
    return { add, resolve }
  } catch {
    return { add: [], resolve: [] }
  }
}

// ponytail: word overlap, not meaning. 0.8 calibrated 2026-10-07 on real asks: rewordings of one ask scored 1.0,
// two different "delete the remote branch X?" asks scored 0.67. Upgrade path: an embedding check if rewordings slip through.
const STOP = new Set(['the', 'and', 'for', 'from', 'with', 'this', 'that', 'instead', 'should', 'into', 'your', 'you', 'its', 'are', 'was', 'now', 'run', 'runs'])
const words = (t: string) => new Set(t.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP.has(w)))
export function isDuplicate(text: string, others: string[]) {
  const a = words(text)
  return others.some(o => {
    const b = words(o)
    const shared = [...a].filter(w => b.has(w)).length
    return shared / Math.max(1, Math.min(a.size, b.size)) >= 0.8
  })
}

// ponytail: cheap gate for the Haiku backstop; errs toward running it. Misses an ask with no "?" and none of these verbs.
export const looksLikeAsk = (answer: string) =>
  /\?|\b(you need to|you'll need to|please|run|press|type|approve|let me know|tell me)\b/i.test(answer)
