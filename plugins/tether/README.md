# Tether

A session dashboard for Claude Code: a `/tether` pane of folding sections for what Claude is waiting on you for, what it's assuming, what it put off, and where your context and money went.

Adapted from ClariSortAi's Terminal Desk (MIT, see `LICENSE`).

## Getting started

1. In the Claude desktop app's Code tab or in a terminal session, run `/plugin marketplace add mgstegmaier/claude-plugins`. You only need this once.
2. Run `/plugin install tether@mgstegmaier`.
3. Run `/reload-plugins`, or start a new session.
4. Start a session. The pane opens by itself. In a terminal narrower than 144 columns it waits until the terminal widens; run `/tether` to open it at any width.

You need Claude Code 2.1.289 or later. To check your version, run `claude --version` in a terminal.

## The pane

`/tether` opens a pane with eight sections. Each section is a card with its name at the top: click the name to fold or unfold it. Context starts folded, which hides its legend and keeps its bar in view, and so does Changes.

No button in the pane sends anything. Each one puts a message in your prompt box, and you press Enter to send it as it stands or edit it first.

**Working on** is a line about what this session is for. It follows the session's title, which arrives with your second prompt and changes when you rename the session. Edit opens it as a text field: type your own note and press Enter to save it, and from then on the title no longer replaces it. Save an empty note to go back to following the title. Your note never renames the session. Folded, the section shows the note on its header line, cut with an ellipsis when it's long; unfold it to see the whole note and Edit. The note belongs to the session, and Claude doesn't read it.

**Context** is the same bar and legend as the `context-band` card: what fills the context window, in Anthropic's palette, with a tick where Claude Code compacts. On the desktop app, hover a part of the bar for its detail.

**Assumptions** lists the last five judgment calls Claude reported, newest first, each with its reason and what it affects. Approve takes an assumption you agree with off the list. Reject, or the number next to it, drafts a correction. If Claude later overturns an assumption itself, the old entry is struck through, and Clear takes it off the list.

**Loose ends** lists work Claude put off, each written as one concrete action Claude could take if you told it to. Lines Claude writes into a file that mark unfinished work (`TODO`, a skipped test, "not implemented") go straight in. Everything else goes through a second, small model that reads your request against Claude's final report and rewrites each loose end so it names the exact file, command or target. That model runs after any answer with a sentence that defers something ("for now", "I haven't", "placeholder"), and after any turn with five or more tool calls. It drops list headings, work skipped on purpose with a reason, and decisions only you can make. While any loose end is open, the same model also runs after every answer and clears the ones your message or Claude's report shows are done, dropped or moot. A loose end still open 10 turns after it appeared clears itself. Do now, or the letter next to an entry, drafts "You left this undone: ... Do it now." Clear drops one entry, and `x` clears the list.

**Action items** lists what Claude is waiting on you for: decisions, choices, questions, things to check, and tasks only you can do. Each ask gets buttons that fit it: Approve and Deny, one per option, Answer, Looks good, Done and Cancel, plus Discuss on every ask. A finished reply ends with a blank line, so you can press buttons on several asks and send the replies together as separate paragraphs. Answer and Discuss leave the cursor after their colon for you to type. An ask leaves the list when you send the reply its button drafted, even if you add to it first. Discuss is the exception: it starts a conversation, so its ask stays until Claude resolves it. Dismiss, on a question, drops it without a message. Clear all, under the list, drops every ask without a message, for a list that has gone stale.

Claude adds asks itself through a tool, `track`, and resolves them when your reply answers them. If Claude ends a turn with something that looks like an ask and didn't call `track`, a backstop runs: one small Claude Haiku request reads the reply and adds what was missed. It runs after the turn ends and skips any ask that matches one open or recently answered.

**Subagents** lists every subagent in the session with its status, type, model, run time and tool calls.

**Cost and tokens** shows session cost, tokens read and written, and the share served from cache.

**Changes** is the session's footprint, kept only until the session closes. Its first list is everything that reached outside your machine or is hard to undo: pushes, PR merges, branch deletes, `rm`, plugin installs, deploys and MCP calls that write, each marked passed or failed. Its second list is the files Claude edited, with edit counts; click a file name to open the file. The last line says whether tests, lint or a build ran after the last code edit, and whether they passed; edits to notes and other prose (`.md`, `.txt` and similar) don't ask for one. Folded, the header sums it up, for example "3 outside · 5 files · unchecked".

**Settings**, at the bottom of the pane or through `/tether settings`, lists every section with Show or Hide and buttons to move it up or down. Reset restores the default order with every section shown. Your choices are saved for every new session.

## Commands

| Command | What it does |
| :- | :- |
| `/tether` | Open the pane |
| `/tether settings` | Choose which sections show and their order |
| `/tether check off` | Stop sending finished turns to the second model |
| `/tether check on` | Turn that check back on (the default) |

## What it adds to your sessions

The pane is drawn locally from numbers Claude Code already keeps. Drawing them makes no model calls and no network calls.

The assumptions and Open asks sections are the parts that cost tokens. Each adds a short instruction to the system prompt (roughly 200 tokens each) and registers one tool (`note_assumption` and `track`). For assumptions, `note_assumption` is the tool that Claude calls when it makes a judgment call you did not state. Each logged assumption is a small tool call, and when Claude logs one as a separate step, that is one extra request at the cached rate. On a large conversation that can be several cents each.

The Loose ends section's file scan is local and free. Its second-model check is one small request to Claude Haiku 4.5 after each answer that defers something, follows five or more tool calls, or ends with a loose end still open, sent with your request and the last part of Claude's answer. `/tether check off` stops it, and with it every loose end that comes from Claude's answers.

## What to know about the numbers

- The session cost comes from Claude Code and is an estimate at API list prices. Your plan may bill differently.
- Tokens and turns count from when the mod loaded, which is the start of the session unless you installed it partway through.
- On a Team or Enterprise plan, or a machine with managed settings, Claude Code stops a mod you install yourself from changing the system prompt, so the assumptions panel may stay empty.
- Loose ends is a prompt to look, not a verdict. The second model reads Claude's report and not its tool calls, so it finds what the report admits to.
- Context figures describe the main conversation. Subagents get their own status but not their own context breakdown.

## Before you install

Mods are not sandboxed. This one reads session usage, tool call names and subagent activity, adds text to the system prompt, and registers a tool. It reads the text Claude writes into files to look for unfinished-work markers, and it sends your request and Claude's final answer to a second Claude model for the check described above. It does not write files or contact any other service. The mod is two files, [`hooks/register.tsx`](./hooks/register.tsx) and [`hooks/split.ts`](./hooks/split.ts), so you can check that for yourself.

## License

MIT
