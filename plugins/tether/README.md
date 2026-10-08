# Tether

A session dashboard for Claude Code: a `/tether` pane of folding sections for what Claude is waiting on you for, what it's assuming, what it put off, and where your context and money went.

Adapted from ClariSortAi's Terminal Desk (MIT).

## Getting started

1. In the Claude desktop app's Code tab or in a terminal session, run `/plugin marketplace add mgstegmaier/claude-plugins`. You only need this once.
2. Run `/plugin install tether@mgstegmaier`.
3. Run `/reload-plugins`, or start a new session.
4. Run `/tether` to open the pane.

You need Claude Code 2.1.289 or later. To check your version, run `claude --version` in a terminal.

## The pane

`/tether` opens a pane with seven sections. Each section is a card with its name at the top: click the name to fold or unfold it. Context starts folded, which hides its legend and keeps its bar in view.

No button in the pane sends anything. Each one puts a message in your prompt box, and you press Enter to send it as it stands or edit it first.

**Working on** is a line you write about what this session is for. It starts as a text field: type the note and press Enter to save it. Edit opens it again. The note belongs to the session, and Claude doesn't read it.

**Context** is the same bar and legend as the `context-band` card: what fills the context window, in Anthropic's palette, with a tick where Claude Code compacts. On the desktop app, hover a part of the bar for its detail.

**Assumptions** lists the last five judgment calls Claude reported, newest first, each with its reason and what it affects. Approve takes an assumption you agree with off the list. Reject, or the number next to it, drafts a correction. If Claude later overturns an assumption itself, the old entry is struck through, and Clear takes it off the list.

**Loose ends** lists work Claude put off. It is filled three ways: sentences in Claude's answer that defer something ("for now", "I did not run", "placeholder"), lines it writes into a file that mark unfinished work (`TODO`, a skipped test, "not implemented"), and a second, small model that reads your request against Claude's final report after any turn with five or more tool calls. Do it now, or the letter next to an entry, drafts "You left this undone: ... Do it now." `x` clears the list.

**Action items** lists what Claude is waiting on you for: decisions, choices, questions, things to check, and tasks only you can do. Each ask gets buttons that fit it: Approve and Deny, one per option, Answer, Looks good, Done and Cancel, plus Discuss on every ask. An ask leaves the list when you send the reply its button drafted, even if you add to it first. Discuss is the exception: it starts a conversation, so its ask stays until Claude resolves it. Dismiss, on a question, drops it without a message.

Claude adds asks itself through a tool, `track`, and resolves them when your reply answers them. If Claude ends a turn with something that looks like an ask and didn't call `track`, a backstop runs: one small Claude Haiku request reads the reply and adds what was missed. It runs after the turn ends and skips any ask that matches one open or recently answered.

**Subagents** lists every subagent in the session with its status, type, model, run time and tool calls.

**Cost and tokens** shows session cost, tokens read and written, and the share served from cache.

## Commands

| Command | What it does |
| :- | :- |
| `/tether` | Open the pane |
| `/tether check off` | Stop sending finished turns to the second model |
| `/tether check on` | Turn that check back on (the default) |

## What it adds to your sessions

The pane is drawn locally from numbers Claude Code already keeps. Drawing them makes no model calls and no network calls.

The assumptions and Open asks sections are the parts that cost tokens. Each adds a short instruction to the system prompt (roughly 200 tokens each) and registers one tool (`note_assumption` and `track`). For assumptions, `note_assumption` is the tool that Claude calls when it makes a judgment call you did not state. Each logged assumption is a small tool call, and when Claude logs one as a separate step, that is one extra request at the cached rate. On a large conversation that can be several cents each.

The Loose ends section's scanning is local and free. Its second-model check is one small request to Claude Haiku 4.5 after each turn that made five or more tool calls, sent with your request and the last part of Claude's answer. `/tether check off` stops it.

## What to know about the numbers

- The session cost comes from Claude Code and is an estimate at API list prices. Your plan may bill differently.
- Tokens and turns count from when the mod loaded, which is the start of the session unless you installed it partway through.
- On a Team or Enterprise plan, or a machine with managed settings, Claude Code stops a mod you install yourself from changing the system prompt, so the assumptions panel may stay empty.
- Loose ends is a prompt to look, not a verdict. The phrase scan flags innocent sentences sometimes, and the second model reads Claude's report and not its tool calls, so it finds what the report admits to.
- Context figures describe the main conversation. Subagents get their own status but not their own context breakdown.

## Before you install

Mods are not sandboxed. This one reads session usage, tool call names and subagent activity, adds text to the system prompt, and registers a tool. It reads the text Claude writes into files to look for unfinished-work markers, and it sends your request and Claude's final answer to a second Claude model for the check described above. It does not write files or contact any other service. The mod is two files, [`hooks/register.tsx`](./hooks/register.tsx) and [`hooks/split.ts`](./hooks/split.ts), so you can check that for yourself.

## License

MIT
