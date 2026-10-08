# vox-calibre

Vox Calibre is the Upland house writing style, packaged as a Claude Code output style. It's plain
language with a human voice. The precision rules come from ASD-STE100 (the simplified technical
English standard), and the voice comes from the Microsoft and GOV.UK plain-language guides.
Claude uses short everyday words, names the actor, puts numbers where adjectives would go, and
defines terms where they first appear.

This plugin is for Claude Code. claude.ai chat has no output styles, so chat users install
[`vox-calibre-chat`](../vox-calibre-chat/) instead.

## Getting started

You need a GitHub login with access to this repository. If you've already added the marketplace
for another plugin from it, skip the first line.

1. In Claude Code, type these one at a time:

   ```
   /plugin marketplace add mgstegmaier/claude-plugins
   /plugin install vox-calibre@mgstegmaier
   ```

   If Claude Code says `Run /reload-plugins to activate`, type that too.

2. Start a new session. Every reply now follows the house style, with nothing to switch on.

The plugin forces its output style while it's enabled, so it replaces any output style you
picked yourself. To go back to yours, disable the plugin with `/plugin disable vox-calibre@mgstegmaier`.

When Michael announces an update, run `/plugin marketplace update mgstegmaier`.

## Changing the rules

`output-styles/vox-calibre.md` is the only copy you edit. The `vox-calibre-chat` skill's body is
generated from it.

1. Edit `plugins/vox-calibre/output-styles/vox-calibre.md`.
2. From the repo root, run `python3 scripts/sync-vox-calibre.py` to copy the change into
   `plugins/vox-calibre-chat/skills/vox-calibre/SKILL.md`.
3. Bump `version` in both plugins' `.claude-plugin/plugin.json` and in both marketplace entries.

Before pushing, `python3 scripts/sync-vox-calibre.py --check` exits with an error if the two
copies differ. If it fails, run step 2 and commit the result.
