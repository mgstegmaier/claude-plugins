# context-band

A Claude Code mod for the Claude desktop app's Code tab and the terminal. It draws a card above the prompt that shows how full the context window is and what's filling it. The context window is everything Claude reads on each turn: its instructions, the tool descriptions, your memory files, and the conversation so far. When it fills up, Claude Code compacts the conversation and the older detail is lost.

## Getting started

1. In the Claude desktop app's Code tab or in a terminal session, run `/plugin marketplace add mgstegmaier/claude-plugins`. You only need this once.
2. Run `/plugin install context-band@mgstegmaier`.
3. Run `/reload-plugins`, or start a new session.
4. Send any message. After Claude replies, the card appears above the prompt.

You need Claude Code 2.1.288 or later. To check your version, run `claude --version` in a terminal.

If the card doesn't appear, check these things:

- The card draws in the desktop app and the terminal. VS Code and mobile keep their usual prompt.
- The card fills in after Claude's first reply in a session.
- Your organization may restrict mods through the `allowManagedModsOnly` managed setting. If it does, ask the Claude admins.

## What it shows

The card starts collapsed. The header shows how many tokens are in use, the size of the window, the point where Claude Code compacts, and what the session has cost so far (`~$4.13`). The cost is the same figure `/cost` reports: every API response in the session priced at Anthropic's list API rates. Depending on your plan, that may not be what you're billed, but it shows what the session would cost on the API. It also shows the percent used in a pill that turns from green to light orange at 50 percent and to orange at 80 percent. The bar under the header has one colored segment per kind of content. In the desktop app, hover a segment to see its name and size. In the terminal, the bar is drawn in block characters across the card's width, with a `│` mark at the compaction point.

Click **context ▸** to open the legend. In the terminal, press ctrl+x tab to move focus to the card, then press Enter on **context ▸**. It lists every slice with its tokens and its share of the window, largest first, with free space last:

- Blue slices are Claude Code's own: the system prompt, the built-in tools, and MCP tools.
- Green slices are setup you control: agents, memory files (CLAUDE.md and rules), and skills.
- Orange slices are the conversation. The mod splits it into your prompts, injected context (hook output, notices, and any re-sent copy of the skill listing or CLAUDE.md), Claude's replies, thinking, tool calls, and tool results. The tool results slice names the tool that produced the most, because that's usually where a session's context goes.

With the legend open, hover a row to see what that slice holds and what fills it most. The detail shows under the legend as soon as the pointer lands; the app applies hover itself, so there's no delay to set. It names the biggest memory files, the MCP servers with the most tool schema, skills grouped by the plugin that ships them, the tools that returned the most, and, for injected context, the hook event that wrote it (`SessionStart`, `UserPromptSubmit`) or `engine` for Claude Code's own reminders. The breakdown names the hook event but not the plugin or script behind it, so several SessionStart hooks show as one figure. In the desktop app, the bar's segments show the same detail when you hover them.

The numbers come from the same estimate `/context` uses. The split of the conversation is the mod's own estimate from the size of each message block, scaled so it adds up to the conversation total `/context` reports. The mod makes no network calls and no paid API calls.

## Limits

- The card draws only in the desktop app and the terminal, not in VS Code or on mobile.
- The card refreshes after each turn, not while Claude is working.
- Subagents' context isn't shown. Only the main conversation is.

## Development

```
claude plugin validate plugins/context-band
claude plugin test plugins/context-band
```
