# vox-calibre-chat

Vox Calibre is the Upland house writing style: plain language with a human voice. This plugin
brings it to claude.ai chat, which has no output styles. The rules ship as a skill, and Claude
loads the skill when you ask it to write something: an email, a Teams message, a doc, a summary,
or a rewrite. Once it's loaded, Claude follows the rules for the rest of that conversation.

In Claude Code, install [`vox-calibre`](../vox-calibre/) instead. It applies the same rules to
every reply as an output style. If you install both, the skill's description tells Claude Code to
skip it while the output style is active. That instruction is a hint Claude usually follows, not a
guarantee.

## Getting started

1. If your organization has installed the plugin for everyone, it's already on. Otherwise, in
   claude.ai, open Customize, choose Skills, and turn on `vox-calibre`.
2. Ask for writing as you normally would. To load it on purpose, say "use the Vox Calibre house
   style".

A skill loads when the task fits, so a short factual answer may come back without it. If you want
the style on every chat reply, paste the contents of
[`skills/vox-calibre/SKILL.md`](skills/vox-calibre/SKILL.md) (everything below the second `---`
line) into your claude.ai personal preferences or into a Project's instructions.

## Changing the rules

Don't edit `SKILL.md` below its "Generated from" line. Those rules come from the `vox-calibre`
output style; see [its README](../vox-calibre/README.md#changing-the-rules).
