# claude-plugins
home-grown, cage-free claude plugins, skills, mods, and more

This repo is a Claude Code plugin marketplace named `mgstegmaier`. Each plugin lives in its own folder under `plugins/`.

## Install

1. In Claude Code, run `/plugin marketplace add mgstegmaier/claude-plugins`. You only need this once.
2. Run `/plugin install <name>@mgstegmaier`, for example `/plugin install tether@mgstegmaier`.
3. Run `/reload-plugins`, or start a new session.

## Plugins

| Plugin | What it does |
|--------|--------------|
| [`context-band`](plugins/context-band/) | A mod for the Claude desktop app and the terminal: a card above the prompt that shows how full the context window is, what fills it, and what the session has cost. Click it for the full breakdown. |
| [`tether`](plugins/tether/) | A mod for the Claude desktop app and the terminal: a `/tether` pane of folding sections for a note on what you're working on, the context bar, the assumptions Claude is making, loose ends it left, action items it's waiting on you for, subagents, and cost. Buttons draft into the prompt box; nothing sends until you press Enter. |
| [`vox-calibre`](plugins/vox-calibre/) | Vox Calibre, a plain-language house writing style with a human voice, as a Claude Code output style for every reply. |
| [`vox-calibre-chat`](plugins/vox-calibre-chat/) | The same Vox Calibre rules as a skill for claude.ai chat, which has no output styles. |

`context-band` and `tether` need Claude Code 2.1.289 or later. Check with `claude --version`.
